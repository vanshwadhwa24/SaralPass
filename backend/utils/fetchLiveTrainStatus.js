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
    const lts = jsonData.props?.pageProps?.ltsData;

    if (!lts || !lts.success) {
      throw new Error("Invalid or missing ltsData structure.");
    }

    // Extract fields exactly as per your blob
    const {
      train_name,
      train_number,
      current_station_name,
      current_station_code,
      status,
      eta,
      etd,
      delay,
      ahead_distance,
      ahead_distance_text,
      update_time,
      travelling_towards,
      upcoming_stations,
      distance_from_source,
      total_distance,
    } = lts;

    const nextStop = upcoming_stations?.[0]; // ✅ First station is always the next stop

    return {
      trainName: train_name,
      trainNumber: train_number,
      currentStationName: current_station_name,
      currentStationCode: current_station_code,
      eta,
      etd,
      delayInMinutes: delay,
      aheadDistanceInKm: ahead_distance,
      aheadDistanceText: ahead_distance_text,
      updateTime: update_time,
      direction: travelling_towards,
      distanceFromSource: distance_from_source,
      totalDistance: total_distance,

      nextStopName: nextStop?.station_name || "N/A",
      nextStopCode: nextStop?.station_code || "N/A",
      nextStopETA: nextStop?.eta || "N/A",
      nextStopETD: nextStop?.etd || "N/A",
      nextStopArrivalDelay: nextStop?.arrival_delay || 0,
      nextStopDistanceFromCurrent: nextStop?.distance_from_current_station || null
    };
  } catch (err) {
    console.error(`❌ Error fetching live status for ${trainNo}:`, err.message);
    return null;
  }
}

module.exports = fetchLiveStatus;

// 🧪 Direct test (you can comment this block during real use)
if (require.main === module) {
  (async () => {
    const result = await fetchLiveStatus("12556");
    console.log("🚂 Live Train Data:", result);
  })();
}
