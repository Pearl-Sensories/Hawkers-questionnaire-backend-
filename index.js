const express = require("express");
const fs = require("fs");
const cors = require("cors");

// Google Sheets setup
const { google } = require("googleapis");
const keys = require("./credentials.json"); // your service account credentials

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Google Sheets auth
const client = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const spreadsheetId = "1uE9IBvuZsYdBX0_vrpr1mcKGOONwx_2xbhwCs2IgPc4"; // your Sheet ID

async function appendToSheet(row) {
  try {
    await client.authorize();
    const sheets = google.sheets({ version: "v4", auth: client });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:Z", // adjust if your sheet name is different
      valueInputOption: "RAW",
      resource: { values: [row] },
    });
  } catch (err) {
    console.error("Error writing to Google Sheet:", err);
  }
}

// Test route
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

// Endpoint to receive form submissions
app.post("/submit", async (req, res) => {
  const response = {
    timestamp: new Date().toISOString(),
    ...req.body,
  };

  let data = [];

  // Save locally
  if (fs.existsSync("responses.json")) {
    try {
      const fileContent = fs.readFileSync("responses.json", "utf-8");
      data = JSON.parse(fileContent);
      if (!Array.isArray(data)) data = [];
    } catch (err) {
      console.error("Error reading local JSON:", err);
      data = [];
    }
  }

  data.push(response);
  fs.writeFileSync("responses.json", JSON.stringify(data, null, 2), "utf-8");

  // Push to Google Sheets
  const row = [
    response.timestamp,
    response.city_town || "",
    response.location_name || "",
    response.bottled_water_brands || "",
    response.csd_brands || "",
    response.malted_soft_drinks_brands || "",
    response.energy_drinks_brands || "",
    response.other_products || "",
    response.products_source || "",
    response.water_source || "",
    response.csd_source || "",
    response.malted_source || "",
    response.energy_source || "",
    response.other_products_source || "",
    response.daily_sales || "",
    response.payment_type || "",
    response.average_weight || "",
  ];

  await appendToSheet(row);

  // Respond to frontend
  res.json({ message: "Saved locally & pushed to Google Sheets 🎉" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
