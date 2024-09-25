import { Request, Response } from "express";
import pool from "../../db"; // Import koneksi database
import { ResultSetHeader } from "mysql2"; // Import tipe data untuk hasil query

// Membaca semua data pengguna
// Membaca semua data pengguna dengan nama lokasi
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role, 
        u.contact_info, 
        l.name AS location_name, 
        l.address AS location_address 
      FROM user u
      LEFT JOIN location l ON u.location_id = l.id
    `;
    const [rows] = await pool.query(query);
    res.json({
      status: "success",
      message: "All users fetched successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Membuat pengguna baru
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, full_name, role, contact_info, location_id } = req.body;

    const query = `
      INSERT INTO user (username, full_name, role, contact_info, location_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query<ResultSetHeader>(query, [
      username,
      full_name,
      role,
      contact_info,
      location_id,
    ]);

    res.json({
      status: "success",
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Membaca data pengguna berdasarkan ID
// Membaca data pengguna berdasarkan ID dengan nama lokasi
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.role, 
        u.contact_info, 
        l.name AS location_name, 
        l.address AS location_address 
      FROM user u
      LEFT JOIN location l ON u.location_id = l.id
      WHERE u.id = ?
    `;
    const [rows] = await pool.query<ResultSetHeader[]>(query, [userId]);

    if ((rows as any[]).length === 0) {
      res.status(404).json({
        status: "error",
        message: "User not found",
      });
      return;
    }

    res.json({
      status: "success",
      message: "User fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Memperbarui data pengguna berdasarkan ID
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;
    const { username, full_name, role, contact_info, location_id } = req.body;

    const query = `
      UPDATE user SET 
      username = ?, 
      full_name = ?, 
      role = ?, 
      contact_info = ?, 
      location_id = ?
      WHERE id = ?
    `;

    const [result] = await pool.query<ResultSetHeader>(query, [
      username,
      full_name,
      role,
      contact_info,
      location_id,
      userId,
    ]);

    if (result.affectedRows === 0) {
      res.status(404).json({
        status: "error",
        message: "User not found",
      });
      return;
    }

    res.json({
      status: "success",
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Menghapus data pengguna berdasarkan ID
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.id;

    const query = `DELETE FROM user WHERE id = ?`;

    const [result] = await pool.query<ResultSetHeader>(query, [userId]);

    if (result.affectedRows === 0) {
      res.status(404).json({
        status: "error",
        message: "User not found",
      });
      return;
    }

    res.json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
