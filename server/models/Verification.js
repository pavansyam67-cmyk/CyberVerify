const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    imagePath: {
      type: String,
      required: true
    },
    brandLogoScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    packagingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    labelScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    result: {
      type: String,
      enum: [
        "Likely Genuine",
        "Suspicious – Needs Verification",
        "Possible Counterfeit"
      ],
      required: true
    },
    recommendation: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Verification", verificationSchema);
