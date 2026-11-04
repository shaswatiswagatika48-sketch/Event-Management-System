import express from "express";
import {
  getTablesByRestaurant,
  getRestaurantTimeAvailability,
  updateTableSection,
  createTable,
  deleteTable
} from "../controllers/tableController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/restaurant/:restaurantId/availability", getRestaurantTimeAvailability);
router.get("/restaurant/:restaurantId", getTablesByRestaurant);
router.post("/", protect, adminOnly, createTable);
router.patch("/:id/section", protect, adminOnly, updateTableSection);
router.delete("/:id", protect, adminOnly, deleteTable);

export default router;
