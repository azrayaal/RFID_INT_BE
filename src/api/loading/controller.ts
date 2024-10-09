import { ResultSetHeader, RowDataPacket } from "mysql2";
import { Request, Response } from "express";
import pool from "../../db";

export const getLoading = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
        SELECT 
            loading.id,
            loading.manifestId,
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS Bag_Weight,
            rfid_tags.quantity AS total,
            loading.vehicle,
            user.full_name AS loadedBy,
            user.contact_info AS loader_contact, 
            loading.loadStartTime,
            loading.loadEndTime,
            loading.status
        FROM loading
        LEFT JOIN rfid_tags ON loading.rfidTagId = rfid_tags.id
        LEFT JOIN user ON loading.loadedBy = user.id
`;

        const [rows] = await pool.query<RowDataPacket[]>(query);
        const totalRows = rows.length;
        
        res.json({
            success: true,
            status: "success",
            message: "All loading records fetched successfully",
            data: rows,
            total: totalRows,
        });
    } catch (error: any) {
        console.error("Error fetching loading records:", error);
        res.status(500).json({
            success: false,
            status: "error",
            message: "Internal Server Error",
        });
    }
};

export const getDetailLoading = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const query = `
        SELECT 
            loading.id,
            loading.manifestId,
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS Bag_Weight,
            rfid_tags.quantity AS total,
            loading.vehicle,
            user.full_name AS loadedBy,
            user.contact_info AS loader_contact, 
            loading.loadStartTime,
            loading.loadEndTime,
            loading.status
        FROM loading
        LEFT JOIN rfid_tags ON loading.rfidTagId = rfid_tags.id
        LEFT JOIN user ON loading.loadedBy = user.id
        WHERE loading.id = ?
`;
        const [rows] = await pool.query<RowDataPacket[]>(query, [id]);
        
        res.json({
            success: true,
            status: "success",
            message: "All loading records fetched successfully",
            data: rows,
        });
    } catch (error: any) {
        console.error("Error fetching loading records:", error);
        res.status(500).json({
            success: false,
            status: "error",
            message: "Internal Server Error",
        });
    }
};

export const createLoading = async (req: Request, res: Response): Promise<void> => {
    const { manifestId, rfidTagId, vehicle, loadedBy,  status } = req.body;

    // Validasi input
    if (!manifestId || !rfidTagId || !vehicle || !loadedBy || !status) {
        res.status(400).json({
            success: false,
            status: "error",
            message: "All fields are required.",
        });
        return;
    }

    try {
        // Fungsi untuk memeriksa keberadaan RFID Tag
        const checkRFIDTag = async (rfidTagId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM rfid_tags WHERE id = ?`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [rfidTagId]);
            return checkResult[0].count > 0; // Mengembalikan true jika RFID Tag ditemukan
        };

        // Fungsi untuk memeriksa apakah RFID Tag sudah digunakan (loaded)
        const isRFIDTagLoaded = async (rfidTagId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM loading WHERE rfidTagId = ? AND status = 'Loaded'`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [rfidTagId]);
            return checkResult[0].count > 0; // Mengembalikan true jika RFID Tag sudah dimuat
        };

        // Memeriksa keberadaan RFID Tag
        const isRFIDTagExists = await checkRFIDTag(rfidTagId);
        if (!isRFIDTagExists) {
            res.status(400).json({
                status: "error",
                message: "RFID Tag ID not found",
            });
            return;
        }

        // Memeriksa apakah RFID Tag sudah dimuat
        const rfidTagLoaded = await isRFIDTagLoaded(rfidTagId);
        if (rfidTagLoaded) {
            res.status(400).json({
                status: "error",
                message: "RFID Tag ID has already been loaded",
            });
            return;
        }

        // Fungsi untuk memeriksa keberadaan manifest
        const checkManifest = async (manifestId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM manifest WHERE id = ?`; // Sesuaikan dengan tabel manifest
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [manifestId]);
            return checkResult[0].count > 0; // Mengembalikan true jika manifest ditemukan
        };

        // Memeriksa keberadaan manifest
        const isManifestExists = await checkManifest(manifestId);
        if (!isManifestExists) {
            res.status(400).json({
                status: "error",
                message: "Manifest ID not found",
            });
            return;
        }

        // Fungsi untuk memeriksa keberadaan User
        const checkUser = async (userId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM user WHERE id = ?`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [userId]);
            return checkResult[0].count > 0; // Mengembalikan true jika User ditemukan
        };

        // Memeriksa keberadaan User
        const isUserExists = await checkUser(loadedBy);
        if (!isUserExists) {
            res.status(400).json({
                status: "error",
                message: "Loaded By ID not found",
            });
            return;
        }

        // Insert data ke tabel loading
        const query = `
        INSERT INTO loading (manifestId, rfidTagId, vehicle, loadedBy, status)
        VALUES (?, ?, ?, ?, ?);`;

        const [result] = await pool.query<ResultSetHeader>(query, [manifestId, rfidTagId, vehicle, loadedBy,  status]);

        // Mengembalikan respons dengan data yang dimasukkan
        res.status(201).json({
            status: "success",
            message: "Loading created successfully",
            data: {
                id: result.insertId,
                manifestId,
                rfidTagId,
                vehicle,
                loadedBy,
                status,
            },
        });
    } catch (error: any) {
        console.error("Error creating loading:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
};

export const deleteLoading = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // Mengambil ID dari parameter URL 

        // Periksa apakah data dengan ID yang diberikan ada
        const checkQuery = `SELECT COUNT(*) AS count FROM loading WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [id]);

        if (checkResult[0].count === 0) {
            res.status(404).json({
                status: "error",
                success: false,
                message: "Loading ID not found", // Pesan jika ID tidak ditemukan
            });
            return; 
        }

        const query = `
        DELETE FROM loading WHERE id = ?;`;  

        const [result] = await pool.query<ResultSetHeader>(query, [id]);    

        // Cek apakah ada baris yang dihapus
        if (result.affectedRows === 0) {    
            res.status(404).json({
                status: "error",
                success: false,
                message: "Loading ID not found", // Pastikan untuk menangani kasus di mana ID tidak ada
            });
            return; 
        }   

        res.json({
            status: "success",
            message: "Loading deleted successfully",
        });
    } catch (error: any) {
        console.error("Error deleting loading:", error);
        res.status(500).json({
            status: "error",
            success: false,
            message: "Internal Server Error", 
        });
    }
};

export const editLoading = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params; // Mengambil ID dari parameter URL
    const { manifestId, rfidTagId, vehicle, loadedBy, status } = req.body; // Mengambil field dari body

    // Validasi input: setidaknya satu field harus diisi untuk edit
    if (!manifestId && !rfidTagId && !vehicle && !loadedBy && !status) {
        res.status(400).json({
            success: false,
            status: "error",
            message: "At least one field is required for update.",
        });
        return;
    }

    try {
        // Periksa apakah data dengan ID yang diberikan ada
        const checkQuery = `SELECT COUNT(*) AS count FROM loading WHERE id = ?`;
        const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [id]);
        
        if (checkResult[0].count === 0) {
            res.status(404).json({
                status: "error",
                message: "Loading not found",
            });
            return;
        }

        // Memeriksa keberadaan manifest
        const checkManifest = async (manifestId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM manifest WHERE id = ?`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [manifestId]);
            return checkResult[0].count > 0; // Mengembalikan true jika manifest ditemukan
        };

        // Memeriksa keberadaan manifest
        if (manifestId && !(await checkManifest(manifestId))) {
            res.status(400).json({
                status: "error",
                message: "Manifest ID not found",
            });
            return;
        }

        // Memeriksa keberadaan RFID Tag
        const checkRFIDTag = async (rfidTagId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM rfid_tags WHERE id = ?`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [rfidTagId]);
            return checkResult[0].count > 0; // Mengembalikan true jika RFID Tag ditemukan
        };

        if (rfidTagId && !(await checkRFIDTag(rfidTagId))) {
            res.status(400).json({
                status: "error",
                message: "RFID Tag ID not found",
            });
            return;
        }

        // Memeriksa keberadaan User
        const checkUser = async (userId: number) => {
            const checkQuery = `SELECT COUNT(*) AS count FROM user WHERE id = ?`;
            const [checkResult] = await pool.query<RowDataPacket[]>(checkQuery, [userId]);
            return checkResult[0].count > 0; // Mengembalikan true jika User ditemukan
        };

        if (loadedBy && !(await checkUser(loadedBy))) {
            res.status(400).json({
                status: "error",
                message: "Loaded By ID not found",
            });
            return;
        }

        // Membangun query update secara dinamis berdasarkan field yang diisi
        const fields = [];
        const values = [];

        if (manifestId) {
            fields.push("manifestId = ?");
            values.push(manifestId);
        }
        if (rfidTagId) {
            fields.push("rfidTagId = ?");
            values.push(rfidTagId);
        }
        if (vehicle) {
            fields.push("vehicle = ?");
            values.push(vehicle);
        }
        if (loadedBy) {
            fields.push("loadedBy = ?");
            values.push(loadedBy);
        }
        if (status) {
            fields.push("status = ?");
            values.push(status);
        }

        // Menambahkan ID ke dalam nilai untuk query
        values.push(id);

        // Menyusun query update
        const query = `
        UPDATE loading 
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
            loading.id,
            loading.manifestId,
            rfid_tags.TID AS BagID,
            rfid_tags.weight AS Bag_Weight,
            rfid_tags.quantity AS total,
            loading.vehicle,
            user.full_name AS loadedBy,
            user.contact_info AS loader_contact, 
            loading.loadStartTime,
            loading.loadEndTime,
            loading.status
        FROM loading
        LEFT JOIN rfid_tags ON loading.rfidTagId = rfid_tags.id
        LEFT JOIN user ON loading.loadedBy = user.id
        WHERE loading.id = ?;
        `;
        
        // Ambil detail dari entri yang baru diedit
        const [details] = await pool.query<RowDataPacket[]>(detailQuery, [id]);

        // Mengembalikan respons dengan data yang diubah
        res.json({
            status: "success",
            message: "Loading updated successfully",
            data: details[0], // Mengembalikan detail yang terbaru
        });
    } catch (error: any) {
        console.error("Error updating loading:", error);
        res.status(500).json({
            status: "error",
            message: "Internal Server Error",
        });
    }
};
