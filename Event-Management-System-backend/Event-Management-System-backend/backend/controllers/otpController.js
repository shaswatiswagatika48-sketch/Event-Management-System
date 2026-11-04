import Otp from "../models/otpModel.js";
import { sendOtpEmail } from "../utils/sendEmail.js";

const validPurposes = ["registration", "event_creation", "booking"];

const makeOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (req, res) => {
  try {
    const { purpose } = req.body;

    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({ message: "Please provide a valid OTP purpose." });
    }

    const email = req.user.email;
    const otp = makeOtp();

    await Otp.deleteMany({ email, purpose });

    await Otp.create({
      email,
      purpose,
      otp,
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendOtpEmail({
      to: email,
      name: req.user.name,
      otp,
      purpose
    });

    console.log(`OTP sent to ${email} for ${purpose}.`);
    res.json({ message: `OTP sent to ${email}.` });
  } catch (error) {
    console.error("OTP send failed:", error.message);
    const message = error.code === "ENETUNREACH"
      ? "The email service is unreachable from the server. Please try again shortly."
      : "Could not send OTP.";
    res.status(500).json({ message, error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp, purpose } = req.body;

    if (!otp || !validPurposes.includes(purpose)) {
      return res.status(400).json({ message: "OTP and a valid purpose are required." });
    }

    const record = await Otp.findOne({
      email: req.user.email,
      purpose,
      verified: false
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired or not requested." });
    }

    if (record.otp !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    record.verified = true;
    await record.save();

    res.json({ message: "Email verified successfully.", verified: true });
  } catch (error) {
    res.status(400).json({ message: "OTP verification failed.", error: error.message });
  }
};

export const isOtpVerified = async (email, purpose) => {
  const record = await Otp.findOne({
    email,
    purpose,
    verified: true,
    expiresAt: { $gt: new Date() }
  });

  return Boolean(record);
};

export const clearOtp = async (email, purpose) => {
  await Otp.deleteMany({ email, purpose });
};
