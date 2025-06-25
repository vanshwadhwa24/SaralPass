// /backend/utils/loadCrossings.js

const fs = require("fs");
const path = require("path");

function loadCrossings() {
  const filePath = path.join(__dirname, "..", "data", "crossings.geojson");

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const geojson = JSON.parse(rawData);

    if (!geojson || !geojson.features) {
      throw new Error("Invalid GeoJSON structure");
    }

    console.log(`✅ Loaded ${geojson.features.length} crossings.`);
    return geojson.features;
  } catch (err) {
    console.error("❌ Error loading GeoJSON:", err.message);
    return [];
  }
}

module.exports = loadCrossings;
