const express = require("express");
const router = express.Router();
const loadStations = require("../utils/loadStations");
const loadCrossings = require("../utils/loadCrossings");
const fetchTrainsAtStation = require("../utils/fetchTrainsAtStation");
const fetchLiveStatus = require("../utils/fetchLiveTrainStatus");
const { getDistanceFromLatLonInKm } = require("../utils/geo");
const parseTimeToToday = require("../utils/time");

const stations = loadStations();
const crossings = loadCrossings();

function findNearestStationTo(lat, lon) {
  let nearest = null;
  let minDist = Infinity;

  for (const station of stations) {
    const dist = getDistanceFromLatLonInKm(lat, lon, station.lat, station.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = station;
    }
  }

  return nearest;
}

router.get("/", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const userLat = parseFloat(lat);
  const userLon = parseFloat(lon);

  console.log("🌍 Received query:", { lat, lon });

  //  Get crossings near user
  const nearbyCrossings = crossings.filter(crossing => {
    const [crossLon, crossLat] = crossing.geometry.coordinates;
    const dist = getDistanceFromLatLonInKm(userLat, userLon, crossLat, crossLon);
    return dist <= 2;
  });

  console.log("🚧 Nearby Crossings:", nearbyCrossings.length);

  if (nearbyCrossings.length === 0) {
    return res.status(404).json({ message: "No nearby crossings found." });
  }

function findNearestCrossingTo(lat, lon, list) {
  let nearest = null;
  let minDist = Infinity;

  for (const crossing of list) {
    const [crossLon, crossLat] = crossing.geometry.coordinates;
    const dist = getDistanceFromLatLonInKm(lat, lon, crossLat, crossLon);
    if (dist < minDist) {
      minDist = dist;
      nearest = crossing;
    }
  }

  return nearest;
}

const nearestCrossing = findNearestCrossingTo(userLat, userLon, nearbyCrossings);


if (!nearestCrossing) {
  return res.status(404).json({ message: "No crossing nearby." });
}


  // 2️⃣ For crossing, find nearest station and fetch trains
  const crossing = nearestCrossing;

    const [crossLon, crossLat] = crossing.geometry.coordinates;
    const crossingName = crossing.properties?.name || "Unnamed Crossing";

    const nearestStation = findNearestStationTo(crossLat, crossLon);
    // if (!nearestStation) continue;

    console.log(`📍 Nearest station to ${crossingName}: ${nearestStation.ref}`);

    const trains = await fetchTrainsAtStation(nearestStation.ref);
    console.log(`🚂 Trains at ${nearestStation.ref}:`, trains.map(t => t.number));

    for (const train of trains) {
      const status = await fetchLiveStatus(train.number);
      console.log(`📡 Status for train ${train.number}:`, status);

      if (!status || status.currentStationName === "No data") continue;

      // 🚦 Smart prediction starts here
      const now = new Date();
      const currentStation = status.current_station;
      const nextStation = status.upcoming_stations?.[0];
      if (!currentStation || !nextStation) continue;

      const distanceToPrev = getDistanceFromLatLonInKm(
        currentStation.lat,
        currentStation.lon,
        crossLat,
        crossLon
      );
      const distanceToNext = getDistanceFromLatLonInKm(
        nextStation.lat,
        nextStation.lon,
        crossLat,
        crossLon
      );

      const aheadDistance = status.ahead_distance ?? 0;
      const distToNext = nextStation.distance_from_current_station ?? 0;

      const etdTime = parseTimeToToday(currentStation.etd);
      const etaTime = parseTimeToToday(nextStation.eta);

      const minutesSinceETD = (now - etdTime) / 60000;
      const minutesUntilETA = (etaTime - now) / 60000;

      const speedFromETD = aheadDistance / (minutesSinceETD || 1);
      const speedToNext = distToNext / (minutesUntilETA || 1);
      const avgSpeed = (speedFromETD + speedToNext) / 2 || 1;

    const t1 = distanceToNext / avgSpeed;
const t2 = distanceToPrev / avgSpeed;

const t1Gap = minutesUntilETA - t1;
const t2Gap = t2 - minutesSinceETD;

const crossingWindow = 8;

const t1Weight = 1 - Math.min(Math.abs(t1Gap) / crossingWindow, 1);
const t2Weight = 1 - Math.min(Math.abs(t2Gap) / crossingWindow, 1);

// 🚨 Max of both — if *either* is suspicious
const likelihoodScore = Math.max(t1Weight, t2Weight);

// You can still use a binary fallback if needed
const willClose = likelihoodScore > 0.6;
if(willClose){
console.log(`🚨 Train ${train.number} will likely cause "${crossingName}" to close!`);
return res.json({
    willClose: true,
    train: train.number,
    crossingName,
    nearestStation: nearestStation.ref,
    eta: etaTime.toISOString()
  });
}
       if (!willClose && avgSpeed > 1) {
  const distanceToCrossing = Math.min(distanceToPrev, distanceToNext);

  const etaCrossing = new Date(etaTime.getTime() - (distanceToNext / avgSpeed) * 60000);
  const etdCrossing = new Date(etdTime.getTime() + (distanceToPrev / avgSpeed) * 60000);

  const estimatedCrossingTime = new Date(Math.min(etaCrossing, etdCrossing));

  const closureStart = new Date(estimatedCrossingTime.getTime() - 5 * 60000);
  const closureEnd = new Date(estimatedCrossingTime.getTime() + 2 * 60000);

  console.log(`⏳ [FUTURE PREDICTION] Train ${train.number} might cause "${crossingName}" to close from ${closureStart.toLocaleTimeString()} to ${closureEnd.toLocaleTimeString()}`);
}
    }
 
 return res.json({
  willClose: false,
  message: `No train is expected to close "${crossingName}" right now.`
});


});



module.exports = router;
