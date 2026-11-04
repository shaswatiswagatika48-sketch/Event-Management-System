import express from "express";
import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant
} from "../controllers/restaurantController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getRestaurants);
router.get("/:id", getRestaurantById);
router.post("/", protect, adminOnly, createRestaurant);
router.patch("/:id", protect, adminOnly, updateRestaurant);

export default router;
