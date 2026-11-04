import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    image: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    description: { type: String, default: "" },
    partyAvailability: {
      type: String,
      enum: ["available", "unavailable", "contact"],
      default: "contact"
    },
    partyDescription: {
      type: String,
      trim: true,
      default: "Please contact the restaurant to confirm party availability."
    },
    openingTime: {
      type: String,
      match: /^([01]\d|2[0-3]):00$/,
      default: "10:00"
    },
    closingTime: {
      type: String,
      match: /^([01]\d|2[0-3]):00$/,
      default: "22:00"
    },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", restaurantSchema);
