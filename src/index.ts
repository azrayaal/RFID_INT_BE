import express from "express";
import rfidRoutes from "../src/app/rfid_tags/router";
import userRoutes from "../src/app/user/router";
import dotenv from "dotenv";

const app = express();
const PORT = process.env.PORT;
const apiv = "/api/v1";

// Memuat konfigurasi dari .env file
dotenv.config();

// Middleware untuk parsing JSON
app.use(express.json());

// Menggunakan rute rfid
app.use(`${apiv}`, rfidRoutes);
app.use(`${apiv}`, userRoutes);

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
