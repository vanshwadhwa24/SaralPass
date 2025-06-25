const express = require("express");
const crossingsRoute = require("./routes/crossings");
const stationsRoute = require("./routes/stations"); // ✅ NEW
// const loadCrossings = require("./utils/loadCrossings");
// const crossings = loadCrossings(); 

const app = express();
const PORT = process.env.PORT || 5000;

// Mount crossings API route
app.use("/crossings", crossingsRoute);
app.use("/stations", stationsRoute); // ✅ NEW


app.get("/", (req, res) => {
  res.send(`Server is running.`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

