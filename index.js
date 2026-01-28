const express = require("express");
const fs = require("fs");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { Parser } = require("json2csv"); // for converting JSON to CSV

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// SQLite database setup
const dbPath = path.join(__dirname, "responses.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error opening database:", err.message);
  else {
    console.log("✅ Connected to SQLite database.");
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
      )`
    );
  }
});

// POST /submit
app.post("/submit", (req, res) => {
  const response = {
    timestamp: new Date().toISOString(),
    ...req.body,
  };

  // Save locally in JSON (optional)
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
    function (err) {
      if (err) {
        console.error("❌ DB insert error:", err.message);
        res.status(500).json({ success: false, error: err.message });
      } else {
        res.json({ success: true, message: "Saved locally & in SQLite 🎉", id: this.lastID });
      }
    }
  );
  stmt.finalize();
});

// GET /responses (JSON)
app.get("/responses", (req, res) => {
  db.all("SELECT * FROM responses ORDER BY id DESC", (err, rows) => {
    if (err) res.status(500).json({ success: false, error: err.message });
    else res.json({ success: true, data: rows });
  });
});

// ✅ GET /export-csv
app.get("/export-csv", (req, res) => {
  db.all("SELECT * FROM responses ORDER BY id ASC", (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const fields = [
      "id", "timestamp", "city_town", "location_name", "bottled_water_brands",
      "csd_brands", "malted_soft_drinks_brands", "energy_drinks_brands", "other_products",
      "products_source", "water_source", "csd_source", "malted_source", "energy_source",
      "other_products_source", "daily_sales", "payment_type", "average_weight"
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("responses.csv");
    res.send(csv);
  });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
