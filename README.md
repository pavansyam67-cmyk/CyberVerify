# CyberVerify

CyberVerify is a Community Service Project (CSP) prototype for product-authenticity awareness.

## Important

This project is NOT an AI or machine-learning system. The current prototype uses JavaScript-based simulated/rule-based scoring to demonstrate the complete website flow.

The result is an initial awareness check and is NOT proof that a product is genuine or counterfeit.

## Features

- Responsive cybersecurity-inspired UI
- Camera access using browser getUserMedia()
- Upload product image
- Image preview
- Prototype analysis
- Brand Logo, Packaging and Product Label scores
- Overall result:
  - Likely Genuine
  - Suspicious – Needs Verification
  - Possible Counterfeit
- MongoDB storage
- Verification history
- REST API
- Delete history item
- Mobile navigation

## Requirements

- Node.js 18+
- MongoDB running locally OR a MongoDB Atlas connection string
- Modern browser

## Installation

1. Open a terminal in this folder.
2. Install packages:

   npm install

3. Copy `.env.example` to `.env`.
4. Set your MongoDB connection string in `.env`.

Example local MongoDB:

MONGODB_URI=mongodb://127.0.0.1:27017/cyberverify

5. Start:

   npm start

6. Open:

   http://localhost:8000

Camera access works on localhost in modern browsers. On a deployed website, HTTPS is normally required for camera access.

## API

POST /api/verification/analyze
- multipart/form-data
- image field: productImage

GET /api/verification/history

GET /api/verification/:id

DELETE /api/verification/:id

GET /api/health

## Database

Database: cyberverify
Collection: verifications

Each record contains:
- imagePath
- brandLogoScore
- packagingScore
- labelScore
- overallScore
- result
- recommendation
- createdAt

## Prototype limitation

The analysis does not identify real counterfeit products. It creates demonstration scores from image properties so the CSP can demonstrate the end-to-end application.

A future version could connect to verified manufacturer data, barcode/QR validation, serial-number verification and a real image-analysis service without changing the basic UI flow.
