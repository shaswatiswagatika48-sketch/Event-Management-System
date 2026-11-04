import Beverage from "../models/beverageModel.js";

// Get beverages by restaurant
export const getBeveragesByRestaurant = async (req, res) => {
  try {
    const records = await Beverage.find({
      restaurant: req.params.restaurantId,
      available: true
    }).sort({ category: 1, name: 1 });
    const seenBeverages = new Set();
    const beverages = records.filter((beverage) => {
      const key = `${beverage.name.trim().toLowerCase()}|${beverage.price}`;
      if (seenBeverages.has(key)) return false;
      seenBeverages.add(key);
      return true;
    });

    return res.status(200).json({
      count: beverages.length,
      beverages
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch beverages.",
      error: error.message
    });
  }
};

// Add one beverage OR multiple beverages
export const addBeverage = async (req, res) => {
  try {
    console.log("Received beverage request:", JSON.stringify(req.body, null, 2));

    const { restaurant, items } = req.body;

    // CASE 1: Add multiple beverages
    if (Array.isArray(items)) {
      if (items.length === 0) {
        return res.status(400).json({
          message: "Please provide at least one beverage."
        });
      }

      if (!restaurant) {
        return res.status(400).json({
          message: "Restaurant ID is required."
        });
      }

      // Add restaurant ID to every beverage
      const beveragesToInsert = items.map((item) => ({
        ...item,
        restaurant: item.restaurant || restaurant
      }));

      const beverages = await Beverage.insertMany(beveragesToInsert);

      return res.status(201).json({
        message: "Beverages added successfully.",
        count: beverages.length,
        beverages
      });
    }

    // CASE 2: Add one beverage
    if (!req.body.name || req.body.price === undefined) {
      return res.status(400).json({
        message: "Name and price are required. For bulk insertion, provide an items array."
      });
    }

    const beverageData = {
      ...req.body,
      restaurant: req.body.restaurant || restaurant
    };

    if (!beverageData.restaurant) {
      return res.status(400).json({
        message: "Restaurant ID is required."
      });
    }

    const beverage = await Beverage.create(beverageData);

    return res.status(201).json({
      message: "Beverage added successfully.",
      beverage
    });

  } catch (error) {
    console.error("Add beverage error:", error);

    return res.status(400).json({
      message: "Could not add beverage.",
      error: error.message
    });
  }
};

// Delete beverage
export const deleteBeverage = async (req, res) => {
  try {
    const beverage = await Beverage.findByIdAndDelete(req.params.id);

    if (!beverage) {
      return res.status(404).json({
        message: "Beverage not found."
      });
    }

    return res.status(200).json({
      message: "Beverage deleted successfully."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not delete beverage.",
      error: error.message
    });
  }
};