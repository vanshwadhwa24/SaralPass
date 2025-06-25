// utils/fetchLiveTrainStatus.js
const axios = require("axios");
const cheerio = require("cheerio");

async function fetchLiveStatus(trainNo) {
  const url = `https://www.railyatri.in/live-train-status/${trainNo}`;
  try {
    const res = await axios.get(url);
    const html = res.data;

    const $ = cheerio.load(html);
    const nextDataScript = $("#__NEXT_DATA__").html();
    const jsonData = JSON.parse(nextDataScript);

    const lts = jsonData.props.pageProps.ltsData;

    return {
      trainName: lts.train_name,
      currentStation: lts.current_station_name,
      delayInMinutes: lts.delay,
      eta: lts.eta,
      etd: lts.etd,
      nextStop: lts.upcoming_stations?.[1]?.station_name || "No upcoming stop",
      nextStopETA: lts.upcoming_stations?.[1]?.eta || "N/A",
      nextStopDelay: lts.upcoming_stations?.[1]?.arrival_delay || 0
    };
  } catch (err) {
    console.error(`❌ Error fetching live status for ${trainNo}:`, err.message);
    return null;
  }
}
module.exports = fetchLiveStatus;


// Test run
(async () => {
  const status = await fetchLiveStatus("12052");
  console.log("🚂 Live Status:", status);
})();
