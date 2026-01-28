const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

/* ================================
   GOOGLE AUTH (SECRET FILE METHOD)
================================ */

// Render secret files live here
const CREDENTIALS_PATH = "/etc/secrets/credentials.json";

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error("❌ credentials.json NOT FOUND at /etc/secrets/");
}

const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

const auth = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const sheets = google.sheets({
  version: "v4",
  auth,
});

const spreadsheetId = "1uE9IBvuZsYdBX0_vrpr1mcKGOONwx_2xbhwCs2IgPc4";
const sheetName = "Sheet1"; // TAB NAME — file name doesn't matter

/* ================================
   HELPERS
================================ */

async function appendToSheet(row) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "A:Z",
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });
  } catch (err) {
    console.error("❌ Google Sheets append error:");
    console.error(err.response?.data || err.message);
    throw err;
  }
}

/* ================================
   ROUTES
================================ */

// Health check
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

/**
 * 🔎 DEBUG ROUTE — THIS IS CRITICAL
 * Visit in browser:
 * https://hawkers-questionnaire-backend.onrender.com/test-google
 */
app.get("/test-google", async (req, res) => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1`,
    });

    res.json({
      success: true,
      message: "Google Sheets connection WORKS ✅",
      sampleCell: result.data.values || "Cell empty",
    });
  } catch (err) {
    console.error("❌ Google Sheets TEST FAILED:");
    console.error(err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

// Form submission
app.post("/submit", async (req, res) => {
  try {
    const response = {
      timestamp: new Date().toISOString(),
      ...req.body,
    };

    // Optional local save
    let data = [];
    if (fs.existsSync("responses.json")) {
      try {
        data = JSON.parse(fs.readFileSync("responses.json", "utf-8"));
        if (!Array.isArray(data)) data = [];
      } catch {
        data = [];
      }
    }

    data.push(response);
    fs.writeFileSync("responses.json", JSON.stringify(data, null, 2));

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

    res.json({ success: true, message: "Saved & pushed to Google Sheets 🎉" });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Failed to save to Google Sheets",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
