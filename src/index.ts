import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from 'cors'
import rfidRoutes from "../src/api/barcode/router";
import userRoutes from "../src/api/user/router";
import receiveRoutes from "../src/api/receiving/router";
import loadingRoutes from "../src/api/loading/router";
import manifestRoutes from "../src/api/manifest/router";

const app = express();
const PORT = process.env.PORT;
const apiv = "/api/v1";

// Memuat konfigurasi dari .env file
dotenv.config()

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "app", "view"));
app.set("public", path.join(__dirname, "app", "public"));

// Middleware untuk parsing request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware untuk file statis
app.use(express.static(path.join(__dirname, "app", "public")));

// Middleware untuk parsing JSON
app.use(express.json());

// Menggunakan rute rfid

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow necessary HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Add other headers if needed
  })
);

app.use(`${apiv}/rfid-tags`, rfidRoutes);
app.use(`${apiv}/users`, userRoutes);
app.use(`${apiv}/receive`, receiveRoutes);
app.use(`${apiv}/loading`, loadingRoutes);
app.use(`${apiv}/manifest`, manifestRoutes);

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
