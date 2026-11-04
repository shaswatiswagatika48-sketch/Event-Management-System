import mongoose from "mongoose";

const beverageSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    category: { type: String, default: "Beverages" },
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Beverage", beverageSchema);
