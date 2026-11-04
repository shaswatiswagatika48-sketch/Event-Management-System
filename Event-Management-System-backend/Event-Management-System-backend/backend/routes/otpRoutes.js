import express from "express";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send", protect, sendOtp);
router.post("/verify", protect, verifyOtp);

export default router;
