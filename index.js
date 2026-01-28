const express = require("express");
const fs = require("fs");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --------------------
// SQLite setup
// --------------------
const dbPath = path.join(__dirname, "data", "responses.db");
const dbFolder = path.dirname(dbPath);

// Ensure folder exists
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error opening database:", err.message);
  else console.log("✅ Connected to SQLite database.");
});

// Create table if not exists
db.run(
  `CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    city_town TEXT,
    location_name TEXT,
    bottled_water_brands TEXT,
    csd_brands TEXT,
    malted_soft_drinks_brands TEXT,
    energy_drinks_brands TEXT,
    other_products TEXT,
    products_source TEXT,
    water_source TEXT,
    csd_source TEXT,
    malted_source TEXT,
    energy_source TEXT,
    other_products_source TEXT,
    daily_sales TEXT,
    payment_type TEXT,
    average_weight TEXT
  )`,
  (err) => {
    if (err) console.error("❌ Table creation error:", err.message);
  }
);

// --------------------
// Google Sheets setup
// --------------------

// Load your service account credentials from a secret file
const keys = JSON.parse(
  fs.readFileSync("/etc/secrets/credentials.json", "utf8")
);

const client = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

// Replace with your actual Sheet ID
const spreadsheetId = "1uE9IBvuZsYdBX0_vrpr1mcKGOONwx_2xbhwCs2IgPc4";

// Function to append a row to the sheet
async function appendToSheet(row) {
  try {
    await client.authorize();
    const sheets = google.sheets({ version: "v4", auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:Z",
      valueInputOption: "RAW",
      resource: { values: [row] },
    });

    console.log("✅ Pushed to Google Sheet");
  } catch (err) {
    console.error("❌ Error pushing to Google Sheet:", err);
  }
}

// --------------------
// Routes
// --------------------

// Test route
app.get("/", (req, res) => {
  res.send("Backend is working ✅");
});

// Submit route
app.post("/submit", async (req, res) => {
  const response = {
    timestamp: new Date().toISOString(),
    ...req.body,
  };

  // Save locally (optional)
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

  // Insert into SQLite
  const stmt = db.prepare(
    `INSERT INTO responses 
      (timestamp, city_town, location_name, bottled_water_brands, csd_brands, malted_soft_drinks_brands,
       energy_drinks_brands, other_products, products_source, water_source, csd_source, malted_source,
       energy_source, other_products_source, daily_sales, payment_type, average_weight)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(
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
    async function (err) {
      if (err) {
        console.error("❌ DB insert error:", err.message);
        res.status(500).json({ success: false, error: err.message });
      } else {
        // Push to Google Sheet
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

        res.json({ success: true, message: "Saved locally, in SQLite & Google Sheet 🎉", id: this.lastID });
      }
    }
  );

  stmt.finalize();
});

// GET /responses route
app.get("/responses", (req, res) => {
  db.all("SELECT * FROM responses ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("❌ DB read error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
