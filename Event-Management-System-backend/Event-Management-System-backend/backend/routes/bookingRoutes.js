import express from "express";
import {
  calculateBooking,
  createBookingOrder,
  createAdminBooking,
  submitPayment,
  verifyPayment,
  getMyBookings,
  getPendingPayments
} from "../controllers/bookingController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/calculate", protect, calculateBooking);
router.post("/create-order", protect, createBookingOrder);
router.post("/submit-payment", protect, submitPayment);
router.get("/my", protect, getMyBookings);

// Admin routes; controller also checks the admin role.
router.post("/admin/create", protect, adminOnly, createAdminBooking);
router.get("/admin/pending-payments", protect, adminOnly, getPendingPayments);
router.post("/admin/verify-payment", protect, adminOnly, verifyPayment);

export default router;
