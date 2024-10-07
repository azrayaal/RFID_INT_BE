import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from 'cors'
import rfidRoutes from "../src/api/rfid_tags/router";
import userRoutes from "../src/api/user/router";

const app = express();
const PORT = process.env.PORT;
const apiv = "/api/v1";

// Memuat konfigurasi dari .env file
dotenv.config();

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


app.use(`${apiv}`, rfidRoutes);
app.use(`${apiv}`, userRoutes);

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
