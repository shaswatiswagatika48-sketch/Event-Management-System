import express from "express";
import {
  calculateBooking,
  createBookingOrder,
  submitPayment,
  verifyPayment,
  getMyBookings,
  getPendingPayments
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/calculate", protect, calculateBooking);
router.post("/create-order", protect, createBookingOrder);
router.post("/submit-payment", protect, submitPayment);
router.get("/my", protect, getMyBookings);

// Admin routes; controller also checks the admin role.
router.get("/admin/pending-payments", protect, getPendingPayments);
router.post("/admin/verify-payment", protect, verifyPayment);

export default router;
