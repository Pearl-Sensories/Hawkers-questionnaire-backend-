const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

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

  // Optional: Save locally
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

  // Insert into Supabase
  const { error } = await supabase.from("responses").insert([response]);

  if (error) {
    console.error("❌ Supabase insert error:", error);
    return res.status(500).json({ success: false, error });
  }

  res.json({ success: true, message: "Saved locally & pushed to Supabase 🎉" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
