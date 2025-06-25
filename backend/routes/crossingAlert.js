const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");

const loadStations = require("../utils/loadStations");
const loadCrossings = require("../utils/loadCrossings");
const { getDistanceFromLatLonInKm } = require("../utils/geo");
const fetchLiveStatus = require("../utils/fetchLiveTrainStatus");
const fetchTrainsAtStation = require("../utils/fetchTrainsAtStation");
const { parseTimeToToday } = require("../utils/time");


const stations = loadStations();
console.log("🧾 Sample Station Data:", stations[0]);
const crossings = loadCrossings();

router.get("/", async (req, res) => {
  const { lat, lon, radius = 10 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);
  const maxDistance = parseFloat(radius);

  console.log("🌍 Received query:", { lat, lon });

  // 1️⃣ Find nearby stations
  const nearbyStations = stations.filter(station => {
    const dist = getDistanceFromLatLonInKm(userLat, userLon, station.lat, station.lon);
    return dist <= maxDistance;
  });

  console.log("🛰️ Nearby Stations:", nearbyStations.map(s => s.ref));

  let allTrainStatuses = [];

  // 2️⃣ For each station, get trains
  for (const station of nearbyStations) {
    const trains = await fetchTrainsAtStation(station.ref);
    console.log(`🚂 Trains at ${station.ref}:`, trains.map(t => t.number));

    // 3️⃣ For each train, fetch live status
    for (const train of trains) {
      const status = await fetchLiveStatus(train.number);
      console.log(`📡 Status for train ${train.number}:`, status);

      if (status && status.currentStation !== "No data") {
        status.trainNumber = train.number;
        status.trainName = train.name || "Unknown";
        status.sourceStation = station.ref;
        allTrainStatuses.push(status);
      }
    }
  }

  console.log("📊 All Train Statuses:", allTrainStatuses);

  if (allTrainStatuses.length === 0) {
    return res.status(404).json({ message: "No train data found" });
  }

  // 4️⃣ Get nearby crossings
  const nearbyCrossings = crossings.filter(crossing => {
    const [crossLon, crossLat] = crossing.geometry.coordinates;
    const dist = getDistanceFromLatLonInKm(userLat, userLon, crossLat, crossLon);
    return dist <= 2;
  });

  console.log("🚧 Nearby Crossings:", nearbyCrossings.length);

  // 5️⃣ Predict crossing closures
  const enrichedStatuses = allTrainStatuses.flatMap(train => {
    return nearbyCrossings.map(crossing => {
      const [crossLon, crossLat] = crossing.geometry.coordinates;

      const stationObj = stations.find(s => s.ref === train.sourceStation);
      if (!stationObj) return null;

      const distanceToCrossing = getDistanceFromLatLonInKm(
        stationObj.lat,
        stationObj.lon,
        crossLat,
        crossLon
      );

      const avgSpeed = distanceToCrossing > 5 ? 60 : 30; // km/h
      const timeToCrossing = (distanceToCrossing / avgSpeed) * 60; // minutes

      const now = new Date();
    const etaTime = parseTimeToToday(train.nextStopETA); // e.g., '22:16'

      const delay = train.delayInMinutes ?? 0;

      const etaWithDelay = new Date(etaTime.getTime() + delay * 60000);
      const timeRemaining = (etaWithDelay.getTime() - now.getTime()) / 60000; // in minutes

      const crossingWindow = 8; // 5 before, 1 during, 2 after
      const willClose = timeRemaining <= timeToCrossing + crossingWindow;

      return {
        train: train.trainName,
        number: train.trainNumber,
        crossingName: crossing.properties?.name || "Unnamed Crossing",
        sourceStation: train.sourceStation,
        distanceToCrossing: distanceToCrossing.toFixed(2),
        timeRemaining: Math.round(timeRemaining),
        etaWithDelay: etaWithDelay.toISOString(),
        willClose,
      };
    }).filter(Boolean);
  });

  const closingSoon = enrichedStatuses.filter(e => e.willClose);
  console.log("🚨 Closings predicted:", closingSoon.length);

  res.json({
    predictedClosures: closingSoon,
    allPredictions: enrichedStatuses
  });
});

module.exports = router;
