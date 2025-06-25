// utils/generateStationTrainMap.js

const fs = require("fs");
const axios = require("axios");
const path = require("path");

const geojson = JSON.parse(fs.readFileSync("./data/stations.geojson", "utf-8"));
const apikey = "Y1f29b8da737d20a43767682e48bb1c43";
const endpoint = "http://indianrailapi.com/api/v2/AllTrainOnStation/apikey";
const outputPath = "./data/stationTrainMap.json";

// Try to resume from previous run
let result = {};
if (fs.existsSync(outputPath)) {
  result = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
}

async function fetchTrains(stationCode) {
  try {
    const url = `${endpoint}/${apikey}/StationCode/${stationCode}`;
    const res = await axios.get(url);
    return res.data?.Trains || [];
  } catch (err) {
    console.error(`❌ Failed for ${stationCode}:`, err.message);
    return null; // null = failed, [] = no trains
  }
}

(async () => {
  const features = geojson.features;

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const code = feature.properties?.ref;
    if (!code || result[code]) continue; // Skip if missing or already fetched

    console.log(`🚉 [${i + 1}/${features.length}] Fetching trains for ${code}...`);
    const trains = await fetchTrains(code);

    if (trains === null) continue; // skip saving if failed

    result[code] = trains.map(t => t.TrainNo);

    // 💾 Save progress every 10 stations
    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log("💾 Auto-saved progress");
    }

    // ⏱️ Throttle
    await new Promise(res => setTimeout(res, 200));
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log("✅ Done! All data saved to", outputPath);
})();
