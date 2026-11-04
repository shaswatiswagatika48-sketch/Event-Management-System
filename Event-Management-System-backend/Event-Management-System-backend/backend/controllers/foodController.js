import Food from "../models/foodModel.js";


export const getFoodByEvent = async (req, res) => {
  try {
    const food = await Food.find({
      event: req.params.eventId,
      available: true
    }).sort({ category: 1, name: 1 });

    res.json({ count: food.length, food });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch food.",
      error: error.message
    });
  }
};

export const getFoodByRestaurant = async (req, res) => {
  try {
    const records = await Food.find({
      restaurant: req.params.restaurantId,
      available: true
    }).sort({ category: 1, name: 1 });

    const seenItems = new Set();
    const food = records.filter((item) => {
      const key = `${item.name.trim().toLowerCase()}|${item.price}`;
      if (seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });

    res.json({ count: food.length, food });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch food.",
      error: error.message
    });
  }
};

export const getFoodForManagement = async (req, res) => {
  try {
    const food = await Food.find({
      restaurant: req.params.restaurantId
    }).sort({ category: 1, name: 1 });

    res.json({ count: food.length, food });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch restaurant food items.",
      error: error.message
    });
  }
};

export const updateFoodImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Choose an image to upload." });
    }

    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: "Food item not found." });
    }

    food.image = `/uploads/food/${req.file.filename}`;
    await food.save();

    res.json({ message: "Food image updated successfully.", food });
  } catch (error) {
    res.status(500).json({
      message: "Could not update the food image.",
      error: error.message
    });
  }
};

export const addFood = async (req, res) => {
  try {
    // FOR both single food and multiple food items
    const foodData = Array.isArray(req.body)
      ? req.body
      : req.body.items
        ? req.body.items
        : req.body;

    // Validate input
    if (
      !foodData ||
      (Array.isArray(foodData) && foodData.length === 0)
    ) {
      return res.status(400).json({
        message: "Please provide at least one food item."
      });
    }

    let food;

    if (Array.isArray(foodData)) {
      // Add multiple food items
      food = await Food.insertMany(foodData);

      return res.status(201).json({
        message: "Food items added successfully.",
        count: food.length,
        food
      });
    }

    // Add a single food item
    food = await Food.create(foodData);

    res.status(201).json({
      message: "Food added successfully.",
      food
    });

  } catch (error) {
    res.status(400).json({
      message: "Could not add food.",
      error: error.message
    });
  }
};

export const deleteFood = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ message: "Food not found." });
    res.json({ message: "Food deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete food.", error: error.message });
  }
};