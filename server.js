

require('dotenv').config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());


// ── Serve API configuration (no secrets exposed) ──
app.get("/config", (req, res) => {
  return res.json({
    apiKey: process.env.WEATHER_API_KEY || null,
    hasApiKey: !!process.env.WEATHER_API_KEY
  });
});
 
// ── Users ──────────────────────────────────────────────────────────────────

// 🔐 API KEYS
const WEATHER_API_KEY = "b81a06693946ba6b520b115afe320111";
const TRAFFIC_API_KEY = "qaStTuAqCFJYMk6UUPRKdbAjPGTpdOJh";

// 👥 USERS

const USERS = [
  { username: "planner1", password: "123", role: "planner" },
  { username: "customer1", password: "123", role: "customer" },
];

// 📦 STORAGE
const deliveries = [];
const routeSessions = {};

// 🔧 HELPERS
function generateId(prefix = "DEL") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function isEmpty(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function addMinutesToTimeString(timeStr, mins) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor((total % 1440) / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// 🌦 WEATHER API
async function getWeatherData(lat, lon) {
  if (isEmpty(lat) || isEmpty(lon)) return "Clear";
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
    );
    const data = await res.json();
    return data.weather[0].main === "Rain" ? "Rain" : "Clear";
  } catch {
    return "Clear";
  }
}

// 🚗 TRAFFIC API (+ fallback)
async function getTrafficData(fromCoords, toCoords) {
  try {
    if (!fromCoords || !toCoords) throw new Error("Missing coordinates");

    const from = `${fromCoords.lat},${fromCoords.lng}`;
    const to = `${toCoords.lat},${toCoords.lng}`;

    const res = await fetch(
      `https://api.tomtom.com/routing/1/calculateRoute/${from}:${to}/json?traffic=true&travelMode=car&key=${TRAFFIC_API_KEY}`
    );
    if (!res.ok) throw new Error("Traffic API unavailable");

    const data = await res.json();
    const delaySeconds =
      data?.routes?.[0]?.summary?.trafficDelayInSeconds || 0;

    if (delaySeconds >= 1200) return "High";
    if (delaySeconds >= 480) return "Medium";
    return "Low";
  } catch {
    // Fallback keeps prediction stable if API fails.
    const approxDistanceKm =
      (Number(fromCoords?.lat) && Number(toCoords?.lat)
        ? Math.abs(fromCoords.lat - toCoords.lat) * 111
        : 0) +
      (Number(fromCoords?.lng) && Number(toCoords?.lng)
        ? Math.abs(fromCoords.lng - toCoords.lng) * 111
        : 0);

    if (approxDistanceKm > 250) return "High";
    if (approxDistanceKm > 120) return "Medium";
    return "Low";
  }
}

// 🧠 PREDICTION ENGINE
async function calculatePrediction(input) {
  const {
    distance,
    timeOfDay,
    expectedDeliveryTime,
    fromCoords,
    toCoords,
  } = input;

  const traffic = await getTrafficData(fromCoords, toCoords);
  const weather = await getWeatherData(fromCoords.lat, fromCoords.lng);

  let score = 0;
  let delay = 0;
  const reasons = [`Traffic status: ${traffic}`, `Weather status: ${weather}`];

  if (traffic === "High") {
    score += 4;
    delay += 25;
    reasons.push("Heavy traffic impact");
  } else if (traffic === "Medium") {
    score += 2;
    delay += 10;
    reasons.push("Moderate traffic impact");
  }

  if (weather === "Rain") {
    score += 2;
    delay += 15;
    reasons.push("Rain impact");
  }

  if (distance > 100) {
    score += 2;
    delay += 15;
  }

  if (timeOfDay === "Evening") {
    score += 2;
    delay += 12;
  }

  const delayLevel =
    score >= 8 ? "High" : score >= 4 ? "Medium" : "Low";

  return {
    delayLevel,
    delayMinutes: delay,
    updatedDeliveryTime: addMinutesToTimeString(
      expectedDeliveryTime,
      delay
    ),
    reasons,
  };
}

// 🧠 BEST ROUTE SELECTOR
function selectBestRoute(routes) {
  const weight = { Low: 0, Medium: 50, High: 120 };

  const scored = routes.map((r, i) => ({
    index: i,
    score:
      weight[r.delayLevel] +
      r.delayMinutes * 1.2 +
      r.distanceKm * 0.3,
  }));

  scored.sort((a, b) => a.score - b.score);

  return {
    bestIndex: scored[0].index,
    explanation: "Best route selected based on delay and distance",
  };
}

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false });
  }

  res.json({ success: true, role: user.role });
});

// 🚀 ROUTE COMPARISON
app.post("/routes/compare", async (req, res) => {
  try {
    const {
      routes,
      timeOfDay,
      expectedDeliveryTime,
      fromCoords,
      toCoords,
    } = req.body;

    const safeFromCoords =
      fromCoords && !isEmpty(fromCoords.lat) && !isEmpty(fromCoords.lng)
        ? fromCoords
        : { lat: 10, lng: 76 };
    const safeToCoords =
      toCoords && !isEmpty(toCoords.lat) && !isEmpty(toCoords.lng)
        ? toCoords
        : { lat: safeFromCoords.lat + 0.6, lng: safeFromCoords.lng + 0.6 };

    const predictions = [];

    for (let r of routes) {
      const result = await calculatePrediction({
        distance: r.distanceKm,
        timeOfDay,
        expectedDeliveryTime,
        fromCoords: safeFromCoords,
        toCoords: safeToCoords,
      });

      predictions.push({
        ...result,
        routeName: r.name,
        distanceKm: r.distanceKm,
        durationMinutes: r.durationMinutes,
      });
    }

    const { bestIndex, explanation } = selectBestRoute(predictions);

    const sessionId = generateId("SES");
    routeSessions[sessionId] = predictions;

    res.json({
      success: true,
      sessionId,
      routes: predictions,
      bestIndex,
      aiExplanation: explanation,
    });
  } catch {
    res.status(400).json({ success: false });
  }
});

// ✅ CONFIRM ROUTE
app.post("/routes/confirm", (req, res) => {
  const { sessionId, chosenRouteIndex, from, to } = req.body;

  const routes = routeSessions[sessionId];
  const chosen = routes[chosenRouteIndex];

  const deliveryId = generateId();

  const delivery = {
    deliveryId,
    from,
    to,
    chosenRoute: chosen,
    status: "dispatched",
    progress: 0,
  };

  deliveries.push(delivery);

  res.json({ success: true, deliveryId });
});

// 📦 STATUS
app.get("/status/:id", (req, res) => {
  const d = deliveries.find((x) => x.deliveryId === req.params.id);

  if (!d) return res.status(404).json({ success: false });

  res.json({ success: true, ...d });
});
app.get("/", (req, res) => {
  res.send("🚀 SupplyIQ Backend is running!");
});
// 🏁 START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});