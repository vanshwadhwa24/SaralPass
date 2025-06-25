const express = require("express");
const crossingsRoute = require("./routes/crossings");
const stationsRoute = require("./routes/stations"); // ✅ NEW
const trainsRouter = require("./routes/trains");
const crossingAlert = require("./routes/crossingAlert");


const app = express();
const PORT = process.env.PORT || 5000;

// Mount crossings API route
app.use("/crossings", crossingsRoute);
app.use("/stations", stationsRoute); // ✅ NEW
app.use("/trains", trainsRouter);
app.use("/crossing-alert", crossingAlert);



app.get("/", (req, res) => {
  res.send(`Server is running.`);

});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

