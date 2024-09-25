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
      message: message,
      resultTags: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
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
        user.contact_info AS updated_by_contact
      FROM rfid_tags
      LEFT JOIN location ON rfid_tags.last_location_id = location.id
      LEFT JOIN user ON rfid_tags.updatedBy = user.id
      WHERE rfid_tags.status = 'inuse'
      `
    );

    res.status(200).json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
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
        user.contact_info AS updated_by_contact
      FROM rfid_tags
      LEFT JOIN location ON rfid_tags.last_location_id = location.id
      LEFT JOIN user ON rfid_tags.updatedBy = user.id
      WHERE rfid_tags.status = 'idle'
      `
    );

    res.status(200).json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching RFID tags:", error);
    res.status(500).json({
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

    // Periksa apakah TID sudah ada di database dan statusnya 'inuse'
    const [checkTID] = await pool.query(
      "SELECT * FROM rfid_tags WHERE TID = ? AND status = 'inuse'",
      [TID]
    );

    if ((checkTID as any[]).length > 0) {
      res.json({ status: "error", message: "Tag already inuse" });
      return;
    }

    const status = "inuse";

    //ambil last location dari user yang scan
    const [lastLocation] = await pool.query<any[]>(
      "SELECT location_id FROM user WHERE id = ?",
      [updatedBy]
    );

    // Query untuk memasukkan data ke rfid_tags
    const query = `
      INSERT INTO rfid_tags (
        TID, 
        EPC, 
        item_name, 
        quantity, 
        item_description, 
        status, 
        updatedBy, 
        last_location_id
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      TID,
      EPC,
      item_name,
      quantity,
      item_description,
      status,
      updatedBy,
      lastLocation[0].location_id,
    ];

    // Eksekusi query untuk insert data
    const [result] = await pool.query<ResultSetHeader>(query, values);

    // Ambil data yang baru di-insert dengan informasi lokasi dan user
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
        user.contact_info AS updated_by_contact
      FROM rfid_tags
      LEFT JOIN location ON rfid_tags.last_location_id = location.id
      LEFT JOIN user ON rfid_tags.updatedBy = user.id
      WHERE rfid_tags.id = ?
    `,
      [result.insertId]
    );

    res.json({
      status: "success",
      message: "RFID tag written successfully",
      data: data[0],
    });
  } catch (error) {
    console.error("Error adding RFID tag:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
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
      res.json({ status: "error", message: "TID not found" });
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
      res.json({ status: "error", message: "User not found" });
      return;
    }

    // Ekstrak id dan location_id dari user
    const userId = user[0].id;
    const userLocationId = user[0].location_id;

    // Query untuk mengubah data item menjadi kosong atau default
    const query = `
      UPDATE rfid_tags 
      SET 
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
      res.json({ status: "error", message: "Failed to clear RFID tag" });
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
        user.contact_info AS updated_by_contact
      FROM rfid_tags
      LEFT JOIN location ON rfid_tags.last_location_id = location.id
      LEFT JOIN user ON rfid_tags.updatedBy = user.id
      WHERE rfid_tags.id = ?
    `,
      [rfidId] // Gunakan id dari rfid tag, bukan TID
    );

    res.json({
      status: "success",
      message: "RFID tag cleared successfully",
      data: clearedTag[0],
    });
  } catch (error) {
    console.error("Error clearing RFID tag:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Controller untuk membaca detail tag RFID berdasarkan TID
export const readTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { TID } = req.body; // Ambil TID dari parameter URL
    console.log(TID);
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
        user.contact_info AS updated_by_contact
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
