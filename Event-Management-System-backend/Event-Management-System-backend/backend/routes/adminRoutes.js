import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, adminKey } = req.body;

    // Admin registration key must be configured in .env
    if (!process.env.ADMIN_SETUP_KEY || adminKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({
        message: "Invalid admin setup key."
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered. Use your existing account."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: "admin"
    });

    return res.status(201).json({
      message: "Admin account created successfully.",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Admin registration failed."
    });
  }
});

export default router;