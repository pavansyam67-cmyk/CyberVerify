const express = require("express");
const fs = require("fs");
const path = require("path");
const Verification = require("../models/Verification");

const router = express.Router();

function calculatePrototypeScores(file) {
  // Prototype-only rule-based scoring.
  // It does NOT determine real authenticity.
  const size = file.size || 0;
  const bytes = file.buffer || Buffer.alloc(0);

  let checksum = 0;
  for (let i = 0; i < Math.min(bytes.length, 5000); i++) {
    checksum = (checksum + bytes[i] * (i + 1)) % 100000;
  }

  const sizeFactor = Math.min(12, Math.floor(size / 100000));
  const base = 72 + ((checksum + sizeFactor) % 20);

  const brandLogoScore = Math.min(98, Math.max(55, base + 2));
  const packagingScore = Math.min(97, Math.max(50, base - 3 + (checksum % 7)));
  const labelScore = Math.min(98, Math.max(52, base + 1 - (checksum % 5)));

  const overallScore = Math.round(
    brandLogoScore * 0.35 +
    packagingScore * 0.35 +
    labelScore * 0.30
  );

  let result;
  if (overallScore >= 85) {
    result = "Likely Genuine";
  } else if (overallScore >= 65) {
    result = "Suspicious – Needs Verification";
  } else {
    result = "Possible Counterfeit";
  }

  let recommendation =
    "For important purchases, verify the product using the manufacturer's official website, an authorized seller, serial number, QR code, barcode, or another official verification method.";

  return {
    brandLogoScore,
    packagingScore,
    labelScore,
    overallScore,
    result,
    recommendation
  };
}

router.post("/analyze", (req, res) => {
  const upload = req.app.locals.upload;

  upload.single("productImage")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ message: "Please upload a product image." });
      }

      const scores = calculatePrototypeScores(req.file);

      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const uploadDir = path.join(__dirname, "..", "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const imagePath = path.join(uploadDir, filename);
      fs.writeFileSync(imagePath, req.file.buffer);

      const record = await Verification.create({
        imagePath: `/uploads/${filename}`,
        ...scores
      });

      res.status(201).json({
        message: "Prototype verification completed.",
        verification: record
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Unable to analyze the image." });
    }
  });
});

router.get("/history", async (req, res) => {
  try {
    const records = await Verification.find()
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Unable to load verification history." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const record = await Verification.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Verification not found." });
    }

    res.json(record);
  } catch (error) {
    res.status(400).json({ message: "Invalid verification ID." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const record = await Verification.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Verification not found." });
    }

    res.json({ message: "Verification deleted." });
  } catch (error) {
    res.status(400).json({ message: "Invalid verification ID." });
  }
});

module.exports = router;
