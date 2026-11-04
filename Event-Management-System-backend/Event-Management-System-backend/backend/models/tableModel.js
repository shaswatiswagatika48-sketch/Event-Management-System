import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true
    },
    tableNumber: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, default: "Main Dining Area" },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

tableSchema.index({ restaurant: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model("Table", tableSchema);
