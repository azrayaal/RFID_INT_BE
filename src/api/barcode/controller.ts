import { Request, Response } from "express";
import pool from "../../db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const getAllRfidTags = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Query ke database untuk mendapatkan semua rfid_tags
    const [rows] = await pool.query<ResultSetHeader[]>(
      "SELECT * FROM rfid_tags"
    );

    const message = "";

    res.json({
      status: "success",
      success: true,
      message: message,
      total: rows.length,
      resultTags: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export const getAllInuseRfidTags = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Query ke database untuk mendapatkan semua rfid_tags
    const [rows] = await pool.query<any[]>(
      `
        SELECT 
          rfid_tags.TID, 
          rfid_tags.EPC, 
          rfid_tags.item_name, 
          rfid_tags.quantity, 
          rfid_tags.item_description, 
          location.name AS last_location_name, 
          location.address AS last_location_address, 
          user.full_name AS updated_by, 
          user.email AS updated_by_contact
        FROM rfid_tags
        LEFT JOIN location ON rfid_tags.last_location_id = location.id
        LEFT JOIN user ON rfid_tags.updatedBy = user.id
        WHERE rfid_tags.status = 'inuse'
        `
    );

    res.status(200).json({
      success: true,
      status: "success",
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export const getAllIdleRfidTags = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Query ke database untuk mendapatkan semua rfid_tags
    const [rows] = await pool.query<any[]>(
      `
        SELECT 
          rfid_tags.TID, 
          rfid_tags.EPC, 
          rfid_tags.item_name, 
          rfid_tags.quantity, 
          rfid_tags.item_description, 
          location.name AS last_location_name, 
          location.address AS last_location_address, 
          user.full_name AS updated_by, 
          user.email AS updated_by_contact
        FROM rfid_tags
        LEFT JOIN location ON rfid_tags.last_location_id = location.id
        LEFT JOIN user ON rfid_tags.updatedBy = user.id
        WHERE rfid_tags.status = 'idle'
        `
    );

    res.status(200).json({
      success: true,
      status: "success",
      total: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export const writeRfidTag = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { TID, EPC, item_name, quantity, item_description, updatedBy } =
      req.body;

    // Validasi untuk memastikan semua field harus diisi
    if (
      !TID ||
      !EPC ||
      !item_name ||
      quantity === undefined ||
      !item_description ||
      !updatedBy
    ) {
      res.json({
        success: false,
        status: "error",
        message: "All fields are required.",
      });
      return;
    }

    // Cek apakah TID sudah ada dengan status 'inuse'
    const [checkTID] = await pool.query(
      "SELECT * FROM rfid_tags WHERE TID = ? AND status = 'inuse'",
      [TID]
    );

    if ((checkTID as any[]).length > 0) {
      res.json({
        success: false,
        status: "error",
        message: "Tag already in use",
      });
      return;
    }

    // Cek apakah EPC sudah ada dengan status 'inuse'
    const [checkEPC] = await pool.query(
      "SELECT * FROM rfid_tags WHERE EPC = ? AND status = 'inuse'",
      [EPC]
    );

    if ((checkEPC as any[]).length > 0) {
      res.json({
        success: false,
        status: "error",
        message: "EPC already in use",
      });
      return;
    }

    // Ambil lokasi terakhir dari user yang update
    const [lastLocation] = await pool.query<any[]>(
      "SELECT location_id FROM user WHERE id = ?",
      [updatedBy]
    );

    // Cek apakah TID sudah ada di database dengan status 'idle'
    const [existingTag] = await pool.query(
      "SELECT * FROM rfid_tags WHERE TID = ? AND status = 'idle'",
      [TID]
    );

    let query = "";
    let values: any[] = [];

    // Jika TID ada dan status 'idle', maka UPDATE data
    if ((existingTag as any[]).length > 0) {
      query = `
          UPDATE rfid_tags
          SET EPC = ?, item_name = ?, quantity = ?, item_description = ?, status = ?, updatedBy = ?, last_location_id = ?
          WHERE TID = ?
        `;
      values = [
        EPC,
        item_name,
        quantity,
        item_description,
        "inuse", // Ubah status menjadi 'inuse'
        updatedBy,
        lastLocation[0].location_id,
        TID,
      ];
    } else {
      // Jika TID tidak ada, lakukan INSERT data baru
      query = `
          INSERT INTO rfid_tags (
            TID, EPC, item_name, quantity, item_description, status, updatedBy, last_location_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
      values = [
        TID,
        EPC,
        item_name,
        quantity,
        item_description,
        "inuse",
        updatedBy,
        lastLocation[0].location_id,
      ];
    }

    // Eksekusi query (baik untuk INSERT atau UPDATE)
    const [result] = await pool.query<ResultSetHeader>(query, values);

    // Ambil data yang di-update atau di-insert
    const [data] = await pool.query<any[]>(
      `
        SELECT 
          rfid_tags.TID, 
          rfid_tags.EPC, 
          rfid_tags.item_name, 
          rfid_tags.quantity, 
          rfid_tags.item_description, 
          location.name AS last_location_name, 
          location.address AS last_location_address, 
          user.full_name AS updated_by, 
          user.email AS updated_by_contact
        FROM rfid_tags
        LEFT JOIN location ON rfid_tags.last_location_id = location.id
        LEFT JOIN user ON rfid_tags.updatedBy = user.id
        WHERE rfid_tags.TID = ?
      `,
      [TID]
    );

    res.json({
      status: "success",
      message: "RFID tag written successfully",
      data: data[0],
    });
  } catch (error: any) {
    console.error("Error adding RFID tag:", error);
    if (error.code === "ER_DUP_ENTRY") {
      // Check for duplicate entry error
      res.status(400).json({
        status: "error",
        message: "Duplicate entry detected. Please check the EPC or TID.",
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
};

export const clearRfidTag = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { TID, updatedBy } = req.body; // Ambil TID dan updatedBy dari body request

    // Periksa apakah TID ada di database
    const [checkTID] = await pool.query<any[]>(
      "SELECT id, last_location_id FROM rfid_tags WHERE TID = ?",
      [TID]
    );

    if (checkTID.length === 0) {
      res.json({ success: false, status: "error", message: "TID not found" });
      return;
    }

    // Ambil ID dari RFID tag yang ditemukan
    const rfidId = checkTID[0].id;

    // Periksa apakah user dengan id updatedBy ada
    const [user] = await pool.query<any[]>(
      "SELECT id, location_id FROM user WHERE id = ?",
      [updatedBy]
    );

    if (user.length === 0) {
      res.json({ success: false, status: "error", message: "User not found" });
      return;
    }

    // Ekstrak id dan location_id dari user
    const userId = user[0].id;
    const userLocationId = user[0].location_id;

    // Query untuk mengubah data item menjadi kosong atau default
    const query = `
        UPDATE rfid_tags 
        SET 
         EPC = '', 
          item_name = '', 
          quantity = NULL, 
          item_description = '', 
          status = 'idle', 
          updatedBy = ?, 
          last_location_id = ?
        WHERE TID = ?
      `;

    // Eksekusi query untuk meng-clear data RFID
    const [result] = await pool.query<ResultSetHeader>(query, [
      userId,
      userLocationId,
      TID,
    ]);

    if (result.affectedRows === 0) {
      res.json({
        success: true,
        status: "error",
        message: "Failed to clear RFID tag",
      });
      return;
    }

    // Ambil data yang telah di-clear untuk konfirmasi
    const [clearedTag] = await pool.query<any[]>(
      `
        SELECT 
          rfid_tags.TID, 
          rfid_tags.EPC, 
          rfid_tags.item_name, 
          rfid_tags.quantity, 
          rfid_tags.item_description, 
          location.name AS last_location_name, 
          location.address AS last_location_address, 
          user.full_name AS updated_by, 
          user.email AS updated_by_contact
        FROM rfid_tags
        LEFT JOIN location ON rfid_tags.last_location_id = location.id
        LEFT JOIN user ON rfid_tags.updatedBy = user.id
        WHERE rfid_tags.id = ?
      `,
      [rfidId] // Gunakan id dari rfid tag, bukan TID
    );

    res.json({
      success: true,
      status: "success",
      message: "RFID tag cleared successfully",
      data: clearedTag[0],
    });
  } catch (error) {
    console.error("Error clearing RFID tag:", error);
    res.status(500).json({
      success: false,
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Controller untuk membaca detail tag RFID berdasarkan TID
export const readTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { TID } = req.body; // Ambil TID dari parameter URL
    // Periksa apakah TID ada di database
    const [tagData] = await pool.query<RowDataPacket[]>(
      `
        SELECT 
          rfid_tags.TID, 
          rfid_tags.EPC, 
          rfid_tags.item_name, 
          rfid_tags.quantity, 
          rfid_tags.item_description, 
          rfid_tags.status,
          location.name AS last_location_name, 
          location.address AS last_location_address, 
          user.full_name AS updated_by, 
          user.email AS updated_by_contact
        FROM rfid_tags
        LEFT JOIN location ON rfid_tags.last_location_id = location.id
        LEFT JOIN user ON rfid_tags.updatedBy = user.id
        WHERE rfid_tags.TID = ?
      `,
      [TID]
    );

    // Jika TID tidak ditemukan
    if (tagData.length === 0) {
      res.json({ status: "error", message: "TID not found" });
      return;
    }

    // Mengirimkan data tag yang ditemukan
    res.json({
      status: "success",
      message: "RFID tag details fetched successfully",
      data: tagData[0],
    });
  } catch (error) {
    console.error("Error fetching RFID tag details:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
