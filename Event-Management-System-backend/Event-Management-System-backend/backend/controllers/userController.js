import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { sendOtpEmail } from "../utils/sendEmail.js";
import Otp from "../models/otpModel.js";

const makeToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const userDetails = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role
});

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }

    const oldUser = await User.findOne({ email: email.toLowerCase() });
    if (oldUser) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Everyone starts as a normal user.
    // Event creator rights are stored inside the Event document.
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      phone: phone || "",
      role: "user"
    });

    // Send the OTP to the email used during registration.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({
      email: user.email,
      purpose: "registration"
    });

    await Otp.create({
      email: user.email,
      purpose: "registration",
      otp,
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    let otpSent = false;

    try {
      await sendOtpEmail({
        to: user.email,
        name: user.name,
        otp,
        purpose: "registration"
      });
      otpSent = true;
    } catch (emailError) {
      console.log("Registration OTP could not be sent:", emailError.message);
    }

    const token = makeToken(user._id);

    res.status(201).json({
      message: otpSent
        ? "Account created. OTP sent to your email."
        : "Account created, but OTP could not be sent. Check your email settings.",
      otpSent,
      token,
      user: userDetails(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed.", error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = makeToken(user._id);

    res.json({
      message: "Login successful.",
      token,
      user: userDetails(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};
