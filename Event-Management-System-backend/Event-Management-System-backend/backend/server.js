import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import beverageRoutes from "./routes/beverageRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";


dotenv.config();
dns.setDefaultResultOrder("ipv4first");

const app = express();
const uploadsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "uploads"
);


app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDirectory, { maxAge: "1d" }));

app.get("/", (req, res) => {
  res.json({
    message: "EventHub backend is running!",
    status: "success"
  });
});

app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/beverages", beverageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
};

startServer();
