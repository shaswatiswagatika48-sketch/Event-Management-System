import Restaurant from "../models/restaurantModel.js";
import RestaurantSlotReservation from "../models/restaurantSlotReservationModel.js";

export const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ active: true }).sort({ rating: -1, name: 1 });
    res.json({ count: restaurants.length, restaurants });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch restaurants.", error: error.message });
  }
};

export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch restaurant.", error: error.message });
  }
};

export const createRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.create(req.body);
    res.status(201).json({ message: "Restaurant added successfully.", restaurant });
  } catch (error) {
    res.status(400).json({ message: "Could not add restaurant.", error: error.message });
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const previousOpeningTime = restaurant.openingTime;
    const previousClosingTime = restaurant.closingTime;
    const fields = [
      "partyAvailability",
      "partyDescription",
      "openingTime",
      "closingTime"
    ];
    for (const field of fields) {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    }

    const timePattern = /^([01]\d|2[0-3]):00$/;
    if (
      !timePattern.test(restaurant.openingTime) ||
      !timePattern.test(restaurant.closingTime) ||
      restaurant.openingTime >= restaurant.closingTime
    ) {
      return res.status(400).json({
        message: "Restaurant hours must be valid whole-hour times, with closing after opening."
      });
    }

    if (
      restaurant.openingTime !== previousOpeningTime ||
      restaurant.closingTime !== previousClosingTime
    ) {
      const reservationDate = new Date();
      reservationDate.setUTCHours(0, 0, 0, 0);
      const conflictingReservation = await RestaurantSlotReservation.exists({
        restaurant: restaurant._id,
        reservationDate: { $gte: reservationDate },
        $or: [
          { reservationTime: { $lt: restaurant.openingTime } },
          { reservationTime: { $gte: restaurant.closingTime } }
        ]
      });
      if (conflictingReservation) {
        return res.status(409).json({
          message: "Restaurant hours cannot exclude an active future reservation slot."
        });
      }
    }

    await restaurant.save();
    res.json({ message: "Restaurant details updated successfully.", restaurant });
  } catch (error) {
    res.status(400).json({
      message: "Could not update restaurant details.",
      error: error.message
    });
  }
};
