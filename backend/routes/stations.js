const express = require("express");
const router = express.Router();
const loadStations = require("../utils/loadStations");
const { getDistanceFromLatLonInKm } = require("../utils/geo");

// Load stations once at startup
const stations = loadStations();

// GET /stations/nearby?lat=...&lon=...&radius=...
router.get("/nearby", (req, res) => {
  const { lat, lon, radius = 10 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);
  const maxDistance = parseFloat(radius);

  const nearbyStations = stations.filter((station) => {
    const { lat: stationLat, lon: stationLon } = station;
    const dist = getDistanceFromLatLonInKm(userLat, userLon, stationLat, stationLon);
    return dist <= maxDistance;
  });

  res.json({ count: nearbyStations.length, stations: nearbyStations });
});

module.exports = router;
