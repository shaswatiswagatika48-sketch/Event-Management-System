import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { randomUUID } from "node:crypto";

const uploadsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "uploads",
  "food"
);

mkdirSync(uploadsDirectory, { recursive: true });

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${allowedTypes.get(file.mimetype)}`);
  }
});

const uploadFoodImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Upload a JPG, PNG, or WebP image."));
      return;
    }

    callback(null, true);
  }
});

export const receiveFoodImage = (req, res, next) => {
  uploadFoodImage.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Image must be 5 MB or smaller." });
      return;
    }

    if (error.message === "Upload a JPG, PNG, or WebP image.") {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  });
};
