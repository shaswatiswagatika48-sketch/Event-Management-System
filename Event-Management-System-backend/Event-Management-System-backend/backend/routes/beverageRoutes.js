import express from "express";
import { getBeveragesByRestaurant, addBeverage, deleteBeverage } from "../controllers/beverageController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/restaurant/:restaurantId", getBeveragesByRestaurant);
router.post("/", protect, adminOnly, addBeverage);
router.delete("/:id", protect, adminOnly, deleteBeverage);

export default router;
