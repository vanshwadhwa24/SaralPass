//fetchTrainsAtStation.js

const axios = require("axios");
const cheerio = require("cheerio");

async function getTrainsFromStation(stationCode) {
  try {
    const url = `https://www.confirmtkt.com/station/${stationCode}`;
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0", // important to avoid getting blocked
      },
    });

    const $ = cheerio.load(html);
    const scriptTags = $("script");

    let rawData = null;

    scriptTags.each((i, el) => {
      const scriptText = $(el).html();
      if (scriptText.includes("data = [")) {
        const match = scriptText.match(/data\s*=\s*(\[\s*{[\s\S]*?}\s*]);/);
        if (match && match[1]) {
          rawData = match[1];
        }
      }
    });

    if (!rawData) {
      console.log("❌ Could not find train data in the page.");
      return [];
    }

    const trains = JSON.parse(rawData);
    return trains.map(t => ({
      name: t.TrainName,
      number: t.TrainNo,
      arrival: t.ArrivalTime,
      departure: t.DepartureTime,
    }));

  } catch (err) {
    console.error(`❌ Error fetching train data: ${err.message}`);
    return [];
  }
}

module.exports = getTrainsFromStation;
