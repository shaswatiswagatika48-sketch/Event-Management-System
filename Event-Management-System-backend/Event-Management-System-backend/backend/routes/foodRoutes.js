import express from "express";
import {
  getFoodByEvent,
  getFoodByRestaurant,
  getFoodForManagement,
  updateFoodImage,
  addFood,
  deleteFood
} from "../controllers/foodController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { receiveFoodImage } from "../utils/foodImageUpload.js";

const router = express.Router();


// Get food for a particular event
router.get("/event/:eventId", getFoodByEvent);
router.get("/restaurant/:restaurantId", getFoodByRestaurant);
router.get("/manage/restaurant/:restaurantId", protect, adminOnly, getFoodForManagement);
router.patch("/:id/image", protect, adminOnly, receiveFoodImage, updateFoodImage);


// Admin adds food
router.post("/", protect, adminOnly, addFood);


// Admin deletes food
router.delete("/:id", protect, adminOnly, deleteFood);

export default router;