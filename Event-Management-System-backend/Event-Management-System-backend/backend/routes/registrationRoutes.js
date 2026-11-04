import express from "express";
import {
  registerForEvent,
  getEventSeats,
  getMyRegistrations,
  rateRegistration,
  cancelRegistration,
  getAllRegistrations
} from "../controllers/registrationController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:eventId/seats", getEventSeats);
router.post("/:eventId", protect, registerForEvent);
router.get("/my", protect, getMyRegistrations);
router.patch("/:registrationId/rating", protect, rateRegistration);
router.delete("/:registrationId", protect, cancelRegistration);
router.get("/", protect, adminOnly, getAllRegistrations);

export default router;
