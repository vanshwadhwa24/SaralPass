function parseTimeToToday(plainTime) {
  const [hour, minute] = plainTime.split(":").map(Number);
  const now = new Date();
  const eta = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  
  // If time has already passed (say it's 11pm and eta was 01am), shift to tomorrow
  if (eta < now) {
    eta.setDate(eta.getDate() + 1);
  }

  return eta;
}
module.exports = parseTimeToToday;