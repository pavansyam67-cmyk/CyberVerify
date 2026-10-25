require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const verificationRoutes = require("./routes/verificationRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  }
});

app.locals.upload = upload;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(uploadDir));
app.use("/api/verification", verificationRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    project: "CyberVerify",
    mode: "Prototype / rule-based analysis",
    ai: false
  });
});

app.use(express.static(path.join(__dirname, "..", "client")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");

    app.listen(PORT, () => {
      console.log(`CyberVerify running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
