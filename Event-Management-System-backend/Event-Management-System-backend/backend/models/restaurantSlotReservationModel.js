import mongoose from "mongoose";

const restaurantSlotReservationSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    reservationDate: { type: Date, required: true },
    reservationTime: { type: String, required: true },
    section: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bookingType: {
      type: String,
      enum: ["registration", "booking", "event"],
      required: true
    }
  },
  { timestamps: true }
);

restaurantSlotReservationSchema.index(
  { restaurant: 1, reservationDate: 1, reservationTime: 1, section: 1 },
  { unique: true }
);
restaurantSlotReservationSchema.index({ bookingId: 1, bookingType: 1 });

export default mongoose.model(
  "RestaurantSlotReservation",
  restaurantSlotReservationSchema
);
