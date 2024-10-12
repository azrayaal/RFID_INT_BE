import pool from "../db";
import jwt from "jsonwebtoken";
import session from "express-session";

const JWT_SECRET = "posIndonesia";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number; // or string, depending on your user ID type
        email: string;
        role: number; // or string, depending on your role type
        location?: number; // Assuming location is a number, change if necessary
        // Add other user properties as needed
      };
    }
  }
}
export const isLoginUser = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [blackListToken]: any = await pool.query(
      "SELECT * FROM token_blacklist WHERE token = ?",
      [token]
    );

    if (blackListToken.length > 0) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          // Jika token expired, logout user secara otomatis
          await pool.query(
            "UPDATE user SET online = 0, jwt_token = NULL, isLoggedIn = false WHERE id = ?",
            [decoded.userId]
          );
          return res.status(401).json({
            message: "Unauthorized: Token has expired. Please log in again.",
          });
        } else {
          return res
            .status(401)
            .json({ message: "Unauthorized: Invalid token" });
        }
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing authentication", error });
  }
};
