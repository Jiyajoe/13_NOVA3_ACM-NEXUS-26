
require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 3000;
 
app.use(express.json());
const cors = require("cors");
app.use(cors());

// ── Serve API configuration (no secrets exposed) ──
app.get("/config", (req, res) => {
  return res.json({
    apiKey: process.env.WEATHER_API_KEY || null,
    hasApiKey: !!process.env.WEATHER_API_KEY
  });
});
 
// ── Users ──────────────────────────────────────────────────────────────────
const USERS = [
  { username: "planner1", password: "123", role: "planner" },
  { username: "customer1", password: "123", role: "customer" },
];
 
// ── In-memory stores ────────────────────────────────────────────────────────
const deliveries = [];          // all confirmed deliveries
const routeSessions = {};       // temporary route-comparison sessions
 
// ── Helpers ─────────────────────────────────────────────────────────────────
function generateId(prefix = "DEL") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
 
function isEmpty(v) {
  return v === undefined || v === null || String(v).trim() === "";
}
 
function addMinutesToTimeString(timeStr, mins) {
  const parts = String(timeStr).split(":");
  if (parts.length !== 2) return null;
  const h = Number(parts[0]), m = Number(parts[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const total = h * 60 + m + mins;
  const norm = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, "0")}:${String(norm % 60).padStart(2, "0")}`;
}
 
// ── Core prediction engine ───────────────────────────────────────────────────
function calculatePrediction(input) {
  const { distance, traffic, weather, timeOfDay, expectedDeliveryTime } = input;
 
  let score = 0, delay = 0;
  const reasons = [], suggestions = [];
 
  if (traffic === "High")        { score += 4; delay += 25; reasons.push("High traffic detected."); suggestions.push("Use an alternate route to avoid congestion."); }
  else if (traffic === "Medium") { score += 2; delay += 10; reasons.push("Medium traffic conditions."); }
 
  if (weather === "Rain")        { score += 2; delay += 15; reasons.push("Rain may slow delivery speed."); suggestions.push("Add buffer time for weather-related delays."); }
 
  if (distance > 100)            { score += 2; delay += 15; reasons.push("Long travel distance increases disruption risk."); suggestions.push("Dispatch earlier for long-distance deliveries."); }
  else if (distance > 50)        { score += 1; delay +=  8; reasons.push("Moderate travel distance."); }
 
  if (timeOfDay === "Evening")   { score += 2; delay += 12; reasons.push("Evening slot often has heavier traffic."); }
  else if (timeOfDay === "Afternoon") { score += 1; delay += 5; reasons.push("Afternoon traffic may cause minor delays."); }
 
  if (traffic === "High" && weather === "Rain") { score += 3; delay += 10; reasons.push("Combined impact: High traffic with rain."); suggestions.push("Consider rerouting and informing customer proactively."); }
 
  const risk = score >= 8 ? "High" : score >= 4 ? "Medium" : "Low";
  return { risk, delayMinutes: delay, updatedDeliveryTime: addMinutesToTimeString(expectedDeliveryTime, delay), reasons, suggestions: [...new Set(suggestions)] };
}
 
// ── Route-level prediction (accepts extra route metadata) ────────────────────
function predictForRoute(routeInput) {
  // routeInput: { distance, traffic, weather, timeOfDay, expectedDeliveryTime, routeName, durationMinutes }
  const base = calculatePrediction(routeInput);
 
  // Slightly vary score based on route duration to differentiate routes
  const durationBonus = routeInput.durationMinutes > 90 ? 5 : 0;
  const extraDelay = durationBonus;
 
  return {
    ...base,
    delayMinutes: base.delayMinutes + extraDelay,
    updatedDeliveryTime: addMinutesToTimeString(routeInput.expectedDeliveryTime, base.delayMinutes + extraDelay),
    routeName: routeInput.routeName,
    distanceKm: routeInput.distance,
    durationMinutes: routeInput.durationMinutes,
  };
}
 
// ── AI best-route selector (rule-based heuristic branded as AI) ──────────────
function selectBestRoute(routes) {
  // Score each route: lower risk + lower delay + shorter distance = better
  const riskWeight = { Low: 0, Medium: 50, High: 120 };
  const scored = routes.map((r, i) => ({
    index: i,
    score: riskWeight[r.risk] + r.delayMinutes * 1.2 + r.distanceKm * 0.3,
  }));
  scored.sort((a, b) => a.score - b.score);
  const best = scored[0].index;
  const explanation = `Route "${routes[best].routeName}" selected: ${routes[best].risk} risk, ${routes[best].delayMinutes} min estimated delay, ${routes[best].distanceKm.toFixed(1)} km. Weighted scoring across risk level, delay, and distance.`;
  return { bestIndex: best, explanation };
}
 
// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
 
// ── Auth ─────────────────────────────────────────────────────────────────────
app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (isEmpty(username) || isEmpty(password))
      return res.status(400).json({ success: false, message: "username and password are required." });
    const user = USERS.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });
    return res.json({ success: true, role: user.role });
  } catch { return res.status(400).json({ success: false, message: "Invalid request." }); }
});
 
// ── Legacy single prediction (kept for backward compat) ─────────────────────
app.post("/predict", (req, res) => {
  try {
    const { distance, traffic, weather, timeOfDay, expectedDeliveryTime } = req.body;
    if ([distance, traffic, weather, timeOfDay, expectedDeliveryTime].some(v => isEmpty(v)))
      return res.status(400).json({ success: false, message: "All fields required." });
 
    const result = calculatePrediction({ distance: Number(distance), traffic, weather, timeOfDay, expectedDeliveryTime });
    const deliveryId = generateId();
    deliveries.push({ deliveryId, input: req.body, output: result, confirmedRoute: null, status: "pending", createdAt: new Date().toISOString() });
    return res.json({ success: true, deliveryId, ...result });
  } catch { return res.status(400).json({ success: false, message: "Invalid request." }); }
});
 
// ── Multi-route comparison ────────────────────────────────────────────────────
// POST /routes/compare
// Body: { traffic, weather, timeOfDay, expectedDeliveryTime, routes: [{ name, distanceKm, durationMinutes }] }
app.post("/routes/compare", (req, res) => {
  try {
    const { traffic, weather, timeOfDay, expectedDeliveryTime, routes } = req.body;
    if (!routes || !Array.isArray(routes) || routes.length < 1)
      return res.status(400).json({ success: false, message: "Provide at least one route." });
 
    const predictions = routes.map(r => predictForRoute({
      distance: r.distanceKm,
      traffic,
      weather,
      timeOfDay,
      expectedDeliveryTime,
      routeName: r.name,
      durationMinutes: r.durationMinutes,
    }));
 
    const { bestIndex, explanation } = selectBestRoute(predictions);
    const sessionId = generateId("SES");
    routeSessions[sessionId] = { traffic, weather, timeOfDay, expectedDeliveryTime, routes: predictions, bestIndex, createdAt: new Date().toISOString() };
 
    return res.json({ success: true, sessionId, routes: predictions, bestIndex, aiExplanation: explanation });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ success: false, message: "Route comparison failed." });
  }
});
 
// ── Confirm route choice ──────────────────────────────────────────────────────
// POST /routes/confirm
// Body: { sessionId, chosenRouteIndex, from, to }
app.post("/routes/confirm", (req, res) => {
  try {
    const { sessionId, chosenRouteIndex, from, to } = req.body;
    const session = routeSessions[sessionId];
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });
 
    const chosen = session.routes[chosenRouteIndex];
    const deliveryId = generateId();
 
    const delivery = {
      deliveryId,
      from,
      to,
      chosenRoute: chosen,
      allRoutes: session.routes,
      bestIndex: session.bestIndex,
      plannedETA: chosen.updatedDeliveryTime,
      status: "dispatched",
      progress: 0,          // 0–100
      createdAt: new Date().toISOString(),
    };
 
    deliveries.push(delivery);
    delete routeSessions[sessionId];
 
    return res.json({ success: true, deliveryId, delivery });
  } catch { return res.status(400).json({ success: false, message: "Confirm failed." }); }
});
 
// ── Delivery status (customer tracking) ──────────────────────────────────────
app.get("/status/:deliveryId", (req, res) => {
  try {
    const record = deliveries.find(d => d.deliveryId === req.params.deliveryId);
    if (!record) return res.status(404).json({ success: false, message: "Delivery not found." });
    return res.json({ success: true, ...record });
  } catch { return res.status(400).json({ success: false, message: "Could not fetch status." }); }
});
 
// ── List all deliveries (planner history) ────────────────────────────────────
app.get("/deliveries", (req, res) => {
  return res.json({ success: true, deliveries });
});

// ── Weather Calculation ─────────────────────────────────────────
// GET /weather/:lat/:lng
app.get("/weather/:lat/:lng", (req, res) => {
  try {
    const { lat, lng } = req.params;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    // Simulate weather based on location (Kerala is 8-12°N, 76-77°E)
    const isKerala = latNum >= 8 && latNum <= 12.5 && lngNum >= 75.5 && lngNum <= 77.5;
    
    // Probabilistic weather simulation
    const weatherTypes = ["Clear", "Clouds", "Rain", "Drizzle"];
    const dataHash = Math.abs(Math.sin(latNum) * Math.sin(lngNum)) * 10000;
    const weatherIdx = Math.floor(dataHash) % weatherTypes.length;
    const weather = weatherTypes[weatherIdx];
    
    const temp = isKerala ? 28 + Math.random() * 4 : 20 + Math.random() * 10;
    const humidity = 60 + Math.random() * 30;
    const windSpeed = 5 + Math.random() * 15;
    
    return res.json({
      success: true,
      location: { lat: latNum, lng: lngNum, isKerala },
      weather: {
        condition: weather,
        temperature: Math.round(temp * 10) / 10,
        humidity: Math.round(humidity),
        windSpeed: Math.round(windSpeed * 10) / 10,
        description: weather === "Rain" ? "Rainy conditions" : weather === "Drizzle" ? "Light drizzle" : weather === "Clouds" ? "Cloudy" : "Clear skies"
      },
      impact: weather === "Rain" ? "High" : weather === "Drizzle" ? "Medium" : "Low"
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ success: false, message: "Weather fetch failed." });
  }
});

// ── Traffic Calculation ──────────────────────────────────────────
// POST /traffic/estimate
// Body: { fromLat, fromLng, toLat, toLng, timeOfDay, dayOfWeek }
app.post("/traffic/estimate", (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, timeOfDay, dayOfWeek } = req.body;
    
    if ([fromLat, fromLng, toLat, toLng, timeOfDay].some(v => isEmpty(v))) {
      return res.status(400).json({ success: false, message: "Required fields: fromLat, fromLng, toLat, toLng, timeOfDay." });
    }

    const latNum1 = parseFloat(fromLat);
    const lngNum1 = parseFloat(fromLng);
    const latNum2 = parseFloat(toLat);
    const lngNum2 = parseFloat(toLng);

    if ([latNum1, lngNum1, latNum2, lngNum2].some(v => isNaN(v))) {
      return res.status(400).json({ success: false, message: "Invalid coordinates." });
    }

    // Estimate distance using simple Haversine approximation
    const R = 6371; // km
    const dLat = (latNum2 - latNum1) * Math.PI / 180;
    const dLng = (lngNum2 - lngNum1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(latNum1 * Math.PI / 180) * Math.cos(latNum2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Traffic level based on time of day and simulated conditions
    let trafficLevel = "Low";
    let speedFactor = 1.0;
    
    if (timeOfDay === "Morning") {
      trafficLevel = Math.random() > 0.6 ? "High" : "Medium";
      speedFactor = trafficLevel === "High" ? 0.5 : 0.75;
    } else if (timeOfDay === "Afternoon") {
      trafficLevel = Math.random() > 0.5 ? "Medium" : "Low";
      speedFactor = trafficLevel === "Medium" ? 0.7 : 1.0;
    } else if (timeOfDay === "Evening") {
      trafficLevel = "High";
      speedFactor = 0.4;
    }

    const baseSpeed = 60; // km/h
    const avgSpeed = baseSpeed * speedFactor;
    const estimatedTime = Math.round((distance / avgSpeed) * 60); // minutes

    return res.json({
      success: true,
      distance: Math.round(distance * 10) / 10,
      trafficLevel,
      avgSpeed: Math.round(avgSpeed),
      estimatedTimeMinutes: estimatedTime,
      speedFactor: Math.round(speedFactor * 100) / 100,
      delay: trafficLevel === "High" ? 25 : trafficLevel === "Medium" ? 10 : 0
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ success: false, message: "Traffic estimation failed." });
  }
});
 
// ── Health ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "SupplyIQ API running." }));
 
app.listen(PORT, () => console.log(`SupplyIQ API → http://localhost:${PORT}`));