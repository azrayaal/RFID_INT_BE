import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import pool from "../../db"; // Assuming you're using a database connection pool
import { ResultSetHeader, RowDataPacket } from "mysql2";

const JWT_SECRET = "posIndonesia"; // Use environment variables in production

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  //check input
  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }
  if (!password) {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  try {
    // Fetch the user from the database by email
    const [userResult] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM user WHERE email = ?",
      [email]
    );

    if (userResult.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Ensure userResult is an array of rows
    if (!Array.isArray(userResult) || userResult.length === 0) {
      res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userResult[0]; // The first row from the result set

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check if the user is already logged in kick by set token to token_blacklist
    if (user.online === 1) {
      const [currentToken] = await pool.query<RowDataPacket[]>(
        "SELECT token FROM user WHERE id = ?",
        [user.id]
      );

      if (currentToken.length > 0) {
        await pool.query("INSERT INTO token_blacklist (token) VALUES (?)", [
          currentToken[0].token,
        ]);
      }

      await pool.query(
        "UPDATE user SET online = 0, token = NULL WHERE id = ?",
        [user.id]
      );
    }

    // Generate a JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        location: user.location_id,
      },
      JWT_SECRET,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    await pool.query("UPDATE user SET online = 1, token = ? WHERE id = ?", [
      token,
      user.id,
    ]);

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      location: user.location,
    };
    // Set user data in req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      location: user.location,
    };

    res.status(200).json({
      success: true,
      token,
      userData,
      message: "Logged in successfully",
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const logout = async (req: Request, res: Response): Promise<void> => {
//   const token = req.headers.authorization?.replace("Bearer ", "");
//   await pool.query("UPDATE user SET online = 0, token = NULL WHERE id = ?", [
//     token.user.id,
//   ]);
//   if (!token) {
//     res.status(401).json({ message: "Unauthorized" });
//     return;
//   }

//   res.status(200).json({ message: "Logged out successfully" });
// };

export const detailLogin = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const [user] = await pool.query<ResultSetHeader[]>(
    "SELECT * FROM user WHERE token = ?",
    [token]
  );
  res.json(user[0]);
};
