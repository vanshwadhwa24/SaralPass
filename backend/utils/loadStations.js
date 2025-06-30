const fs = require("fs");
const path = require("path");

function loadStations() {
  const filePath = path.join(__dirname, "..", "data", "stations.geojson");

  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const geojson = JSON.parse(rawData);

    if (!geojson || !geojson.features) {
      throw new Error("Invalid GeoJSON structure");
    }

    const stations = geojson.features.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      return {
        name: props.name || "Unknown",
        lat,
        lon,
        ref: props.ref || null,
        operator: props.operator || null,
        railway: props.railway || null,
        tags: props
      };
    });

    console.log(`✅ Loaded ${stations.length} stations.`);
    return stations;

  } catch (err) {
    console.error("❌ Error loading stations GeoJSON:", err.message);
    return [];
  }
}

module.exports = loadStations;
