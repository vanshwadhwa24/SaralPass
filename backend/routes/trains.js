const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");
const getTrainsFromStation = require("../utils/fetchTrainsAtStation");

// GET /trains/:stationCode
router.get("/:stationCode", async (req, res) => {
  const { stationCode } = req.params;
  const trains = await getTrainsFromStation(stationCode.toUpperCase());
  res.json(trains);
});

const fetchLiveStatus = require("../utils/fetchLiveTrainStatus");

// 🚆 GET /trains/live/:trainNumber
router.get("/live/:trainNumber", async (req, res) => {
  const { trainNumber } = req.params;
  const status = await fetchLiveStatus(trainNumber);
  if (!status) {
    return res.status(500).json({ error: "Failed to fetch live status" });
  }
  res.json(status);
});



module.exports = router;
