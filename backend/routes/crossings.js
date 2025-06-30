const express = require("express");
const router = express.Router();
const loadCrossings = require("../utils/loadCrossings");
const { getDistanceFromLatLonInKm } = require("../utils/geo");

// Load crossings at startup
const crossings = loadCrossings();

// GET /crossings/nearby?lat=...&lon=...&radius=...
router.get("/nearby", (req, res) => {
  const { lat, lon, radius = 2 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);
  const maxDistance = parseFloat(radius);

  const nearby = crossings.filter((crossing) => {
    const [lon2, lat2] = crossing.geometry.coordinates;
    const dist = getDistanceFromLatLonInKm(userLat, userLon, lat2, lon2);
    return dist <= maxDistance;
  });

  res.json({ count: nearby.length, crossings: nearby });
});

module.exports = router;
