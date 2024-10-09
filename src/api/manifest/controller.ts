import { ResultSetHeader, RowDataPacket } from "mysql2";
import { Request, Response } from "express";
import pool from "../../db";

export const getReceiving = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const query = `
        SELECT 
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS bag_weight,
            rfid_tags.quantity AS total,
            user.full_name AS receiver_name,
            user.contact_info AS receiver_contact,
            location.name AS destination,
            receive.status,
            receive.receivedTime AS scanned_at,
            receive.id
        FROM receive
        LEFT JOIN rfid_tags ON receive.rfidTagId = rfid_tags.id
        LEFT JOIN user ON receive.receivedBy = user.id
        LEFT JOIN location ON receive.locationId = location.id;`;
        

        const [rows] = await pool.query<RowDataPacket[]>(query);
        const totalRows = rows.length;
        res.json({
            success: true,
            status: "success",
            message: "All receiving fetched successfully",
            data: rows,
            total: totalRows,
        });
    } catch (error: any) {
        console.error("Error fetching receiving:", error);
        res.status(500).json({
            success: false,
            status: "error",
            message: "Internal Server Error",
        });
    }
}

export const createReceiving = async (req: Request, res: Response): Promise<void> => {
    const { rfidTagId, locationId, receivedBy, status } = req.body;

    // Validasi input
    if (!rfidTagId || !locationId || !receivedBy || !status) {
        res.status(400).json({
            success: false,
            status: "error",
            message: "All fields are required.",
        });
        return;
    }

    // Fungsi untuk memeriksa keberadaan RFID Tag
    const checkRFIDTag = async (rfidTagId: number) => {
        const checkQuery = `SELECT COUNT(*) AS count FROM rfid_tags WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [rfidTagId]);
        return checkResult[0].count > 0; // Mengembalikan true jika RFID Tag ditemukan
    };

    // Fungsi untuk memeriksa keberadaan User
    const checkUser = async (userId: number) => {
        const checkQuery = `SELECT COUNT(*) AS count FROM user WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [userId]);
        return checkResult[0].count > 0; // Mengembalikan true jika User ditemukan
    };

    // Fungsi untuk memeriksa keberadaan Location
    const checkLocation = async (locationId: number) => {
        const checkQuery = `SELECT COUNT(*) AS count FROM location WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [locationId]);
        return checkResult[0].count > 0; // Mengembalikan true jika Location ditemukan
    };

    // Fungsi untuk memeriksa apakah RFID Tag sudah digunakan
    const isRFIDTagUsed = async (rfidTagId: number) => {
        const checkQuery = `SELECT COUNT(*) AS count FROM receive WHERE rfidTagId = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [rfidTagId]);
        return checkResult[0].count > 0; // Mengembalikan true jika RFID Tag sudah digunakan
    };

    // Memeriksa keberadaan RFID Tag, User, dan Location
    const isRFIDTagExists = await checkRFIDTag(rfidTagId);
    if (!isRFIDTagExists) {
        res.status(400).json({
            status: "error",
            message: "RFID Tag ID not found",
        });
        return;
    }

    const isUserExists = await checkUser(receivedBy);
    if (!isUserExists) {
        res.status(400).json({
            status: "error",
            message: "Received By ID not found",
        });
        return;
    }

    const isLocationExists = await checkLocation(locationId);
    if (!isLocationExists) {
        res.status(400).json({
            status: "error",
            message: "Location ID not found",
        });
        return;
    }

    // Memeriksa apakah RFID Tag sudah digunakan
    const rfidTagUsed = await isRFIDTagUsed(rfidTagId);
    if (rfidTagUsed) {
        res.status(400).json({
            status: "error",
            message: "RFID Tag ID has already been used",
        });
        return;
    }

    try {
        // Insert data ke tabel receive
        const query = `
        INSERT INTO receive (rfidTagId, locationId, receivedTime, receivedBy, status)
        VALUES (?, ?, CURRENT_TIMESTAMP(), ?, ?);
        `;
        
        const [result] = await pool.query<ResultSetHeader>(query, [rfidTagId, locationId, receivedBy, status]);

        // Query untuk mengambil detail yang baru saja dimasukkan
        const detailQuery = `
        SELECT 
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS bag_weight,
            rfid_tags.quantity AS total,
            user.full_name AS receiver_name,
            user.contact_info AS receiver_contact,
            location.name AS destination,
            receive.status,
            receive.receivedTime AS scanned_at,
            receive.id
        FROM receive
        LEFT JOIN rfid_tags ON receive.rfidTagId = rfid_tags.id
        LEFT JOIN user ON receive.receivedBy = user.id
        LEFT JOIN location ON receive.locationId = location.id
        WHERE receive.id = ?;
        `;
        
        // Ambil detail dari entri yang baru dibuat
        const [details] = await pool.query<RowDataPacket[]>(detailQuery, [result.insertId]);

        // Mengembalikan respons dengan data yang dimasukkan
        res.status(201).json({
            status: "success",
            message: "Receiving created successfully",
            data: details[0], // Mengembalikan detail lengkap dari entri yang baru dibuat
        });
    } catch (error: any) {
        console.error("Error creating receiving:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
};

export const getDetailReceiving = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Mengambil id dari params dengan benar
        const { id } = req.params; // Ubah ini menjadi req.params.id

        const query = `
        SELECT 
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS bag_weight,
            rfid_tags.quantity AS total,
            user.full_name AS receiver_name,
            user.contact_info AS receiver_contact,
            location.name AS destination,
            receive.status,
            receive.receivedTime AS scanned_at,
            receive.id
        FROM receive
        LEFT JOIN rfid_tags ON receive.rfidTagId = rfid_tags.id
        LEFT JOIN user ON receive.receivedBy = user.id
        LEFT JOIN location ON receive.locationId = location.id
        WHERE receive.id = ?;
        `;

        const [rows] = await pool.query<RowDataPacket[]>(query, [id]); // Pindahkan parameter ke sini
        
        if (rows.length === 0) {
            res.status(404).json({
                status: "error",
                success: false,
                message: "Receiving not found",
            });
            return;
        }

        res.json({
            success: true,
            status: "success",
            message: "Receiving detail fetched successfully",
            data: rows[0], // Mengambil hanya satu objek detail
        });
    } catch (error: any) {
        console.error("Error fetching receiving:", error);
        res.status(500).json({
            success: false,
            status: "error",
            message: "Internal Server Error",
        });
    }
};

export const deleteReceiving = async (req: Request, res: Response): Promise<void> => {
    try {
        // Mengambil id dari params dengan benar
        const { id } = req.params; // Ubah ini menjadi req.params.id 

        const query = `
        DELETE FROM receive WHERE id = ?;
        `;  

        const [result] = await pool.query<ResultSetHeader>(query, [id]);    

        if (result.affectedRows === 0) {    
            res.status(404).json({
                status: "error",
                success: false,
                message: "Receiving not found",
            });
            return; 
        }   

        res.json({
            status: "success",
            message: "Receiving deleted successfully",
        });
    } catch (error: any) {
        console.error("Error deleting receiving:", error);
        res.status(500).json({
            status: "error",
            success: false,
            message: "Internal Server Error", 
        });
    }
}

export const editReceiving = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Mengambil ID dari parameter URL
    const { rfidTagId, locationId, receivedBy, status } = req.body; // Mengambil field dari body

    // Validasi input: setidaknya satu field harus diisi untuk edit
    if (!rfidTagId && !locationId && !receivedBy && !status) {
        res.status(400).json({
            success: false,
            status: "error",
            message: "At least one field is required for update.",
        });
        return;
    }

    try {
        // Periksa apakah data dengan ID yang diberikan ada
        const checkQuery = `SELECT COUNT(*) AS count FROM receive WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [id]);
        
        if (checkResult[0].count === 0) {
            res.status(404).json({
                status: "error",
                message: "Receiving not found",
            });
            return;
        }

        // Membangun query update secara dinamis berdasarkan field yang diisi
        const fields = [];
        const values = [];

        if (rfidTagId) {
            fields.push("rfidTagId = ?");
            values.push(rfidTagId);
        }
        if (locationId) {
            fields.push("locationId = ?");
            values.push(locationId);
        }
        if (receivedBy) {
            fields.push("receivedBy = ?");
            values.push(receivedBy);
        }
        if (status) {
            fields.push("status = ?");
            values.push(status);
        }

        // Menambahkan ID ke dalam nilai untuk query
        values.push(id);

        // Menyusun query update
        const query = `
        UPDATE receive 
        SET ${fields.join(", ")}
        WHERE id = ?;
        `;
        
        // Menjalankan query
        const [result] = await pool.query<ResultSetHeader>(query, values);

        // Cek apakah ada perubahan yang dilakukan
        if (result.affectedRows === 0) {
            res.status(404).json({
                status: "error",
                message: "No changes made",
            });
            return;
        }
        
        // Query untuk mengambil detail yang baru saja diedit
        const detailQuery = `
        SELECT 
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS bag_weight,
            rfid_tags.quantity AS total,
            user.full_name AS receiver_name,
            user.contact_info AS receiver_contact,
            location.name AS destination,
            receive.status,
            receive.receivedTime AS scanned_at,
            receive.id
        FROM receive
        LEFT JOIN rfid_tags ON receive.rfidTagId = rfid_tags.id
        LEFT JOIN user ON receive.receivedBy = user.id
        LEFT JOIN location ON receive.locationId = location.id
        WHERE receive.id = ?;
        `;
        
        // Ambil detail dari entri yang baru diedit
        const [details] = await pool.query<RowDataPacket[]>(detailQuery, [id]);

        // Mengembalikan respons dengan data yang diubah
        res.json({
            status: "success",
            message: "Receiving updated successfully",
            data: details[0], // Mengembalikan detail yang terbaru
        });
    } catch (error: any) {
        console.error("Error updating receiving:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
};

