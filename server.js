const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

const cors = require('cors');
app.use(cors());

// Hardcoded users for prototype login
const USERS = [
  { username: "planner1", password: "123", role: "planner" },
  { username: "customer1", password: "123", role: "customer" },
];

// In-memory storage for prediction results
const deliveries = [];

// Simple unique ID generator for delivery records
function generateDeliveryId() {
  return `DEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function addMinutesToTimeString(timeString, minutesToAdd) {
  // Expected input like "10:30" or "14:45"
  const parts = String(timeString).split(":");
  if (parts.length !== 2) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const total = hours * 60 + minutes + minutesToAdd;
  const dayMinutes = 24 * 60;
  const normalized = ((total % dayMinutes) + dayMinutes) % dayMinutes;

  const newHours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const newMinutes = (normalized % 60).toString().padStart(2, "0");

  return `${newHours}:${newMinutes}`;
}

function validatePredictInput(body) {
  const { distance, traffic, weather, timeOfDay, expectedDeliveryTime } = body;

  if (
    isEmpty(distance) ||
    isEmpty(traffic) ||
    isEmpty(weather) ||
    isEmpty(timeOfDay) ||
    isEmpty(expectedDeliveryTime)
  ) {
    return "All fields are required: distance, traffic, weather, timeOfDay, expectedDeliveryTime.";
  }

  const distanceNum = Number(distance);
  if (Number.isNaN(distanceNum) || distanceNum < 0) {
    return "distance must be a valid non-negative number.";
  }

  const validTraffic = ["Low", "Medium", "High"];
  const validWeather = ["Clear", "Rain"];
  const validTimeOfDay = ["Morning", "Afternoon", "Evening"];

  if (!validTraffic.includes(traffic)) {
    return "traffic must be one of: Low, Medium, High.";
  }

  if (!validWeather.includes(weather)) {
    return "weather must be one of: Clear, Rain.";
  }

  if (!validTimeOfDay.includes(timeOfDay)) {
    return "timeOfDay must be one of: Morning, Afternoon, Evening.";
  }

  if (!addMinutesToTimeString(expectedDeliveryTime, 0)) {
    return "expectedDeliveryTime must be in HH:MM 24-hour format (example: 14:30).";
  }

  return null;
}

function calculatePrediction(input) {
  const { distance, traffic, weather, timeOfDay, expectedDeliveryTime } = input;

  let score = 0;
  let delayMinutes = 0;
  const reasons = [];
  const suggestions = [];

  // Traffic has highest weight
  if (traffic === "High") {
    score += 4;
    delayMinutes += 25;
    reasons.push("High traffic detected.");
    suggestions.push("Use an alternate route to avoid congestion.");
  } else if (traffic === "Medium") {
    score += 2;
    delayMinutes += 10;
    reasons.push("Medium traffic conditions.");
  } else {
    score += 0;
  }

  // Weather has medium weight
  if (weather === "Rain") {
    score += 2;
    delayMinutes += 15;
    reasons.push("Rain may slow down delivery speed.");
    suggestions.push("Add buffer time for weather-related delays.");
  }

  // Distance has medium weight
  if (distance > 100) {
    score += 2;
    delayMinutes += 15;
    reasons.push("Long travel distance increases disruption risk.");
    suggestions.push("Dispatch earlier for long-distance deliveries.");
  } else if (distance > 50) {
    score += 1;
    delayMinutes += 8;
    reasons.push("Moderate travel distance.");
  }

  // Time of day has medium weight
  if (timeOfDay === "Evening") {
    score += 2;
    delayMinutes += 12;
    reasons.push("Evening slot often has heavier traffic.");
  } else if (timeOfDay === "Afternoon") {
    score += 1;
    delayMinutes += 5;
    reasons.push("Afternoon traffic may cause minor delay.");
  }

  // Combined condition example: High traffic + Rain => significantly higher risk
  if (traffic === "High" && weather === "Rain") {
    score += 3;
    delayMinutes += 10;
    reasons.push("Combined impact: High traffic with rain.");
    suggestions.push("Consider rerouting and informing customer proactively.");
  }

  let risk = "Low";
  if (score >= 8) {
    risk = "High";
  } else if (score >= 4) {
    risk = "Medium";
  }

  const updatedDeliveryTime = addMinutesToTimeString(expectedDeliveryTime, delayMinutes);

  // Remove duplicate suggestions for cleaner response
  const uniqueSuggestions = [...new Set(suggestions)];

  // مستقبل: integrate weather API here
  // مستقبل: integrate traffic API here
  // مستقبل: replace rule-based score with AI/ML prediction model

  return {
    risk,
    delayMinutes,
    updatedDeliveryTime,
    reasons,
    suggestions: uniqueSuggestions,
  };
}

app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (isEmpty(username) || isEmpty(password)) {
      return res.status(400).json({
        success: false,
        message: "username and password are required.",
      });
    }

    const user = USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      role: user.role,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request payload.",
    });
  }
});

app.post("/predict", (req, res) => {
  try {
    const validationError = validatePredictInput(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const { distance, traffic, weather, timeOfDay, expectedDeliveryTime } = req.body;

    const result = calculatePrediction({
      distance: Number(distance),
      traffic,
      weather,
      timeOfDay,
      expectedDeliveryTime,
    });

    const deliveryRecord = {
      deliveryId: generateDeliveryId(),
      input: {
        distance: Number(distance),
        traffic,
        weather,
        timeOfDay,
        expectedDeliveryTime,
      },
      output: {
        risk: result.risk,
        delayMinutes: result.delayMinutes,
        updatedDeliveryTime: result.updatedDeliveryTime,
        reasons: result.reasons,
        suggestions: result.suggestions,
      },
      createdAt: new Date().toISOString(),
    };

    deliveries.push(deliveryRecord);

    return res.status(200).json({
      success: true,
      message: "Prediction generated successfully.",
      deliveryId: deliveryRecord.deliveryId,
      risk: result.risk,
      delayMinutes: result.delayMinutes,
      updatedDeliveryTime: result.updatedDeliveryTime,
      reasons: result.reasons,
      suggestions: result.suggestions,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid request payload.",
    });
  }
});

app.get("/status/:deliveryId", (req, res) => {
  try {
    const { deliveryId } = req.params;

    if (isEmpty(deliveryId)) {
      return res.status(400).json({
        success: false,
        message: "deliveryId is required.",
      });
    }

    const record = deliveries.find((item) => item.deliveryId === deliveryId);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    return res.status(200).json({
      success: true,
      deliveryId: record.deliveryId,
      risk: record.output.risk,
      delayMinutes: record.output.delayMinutes,
      updatedDeliveryTime: record.output.updatedDeliveryTime,
      reasons: record.output.reasons,
      suggestions: record.output.suggestions,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Could not fetch delivery status.",
    });
  }
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Smart Supply Chain Disruption Prediction System API is running.",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

/*
Sample Requests & Responses

1) Login
POST /login
{
  "username": "planner1",
  "password": "123"
}

Response (200)
{
  "success": true,
  "message": "Login successful.",
  "role": "planner"
}

2) Prediction
POST /predict
{
  "distance": 120,
  "traffic": "High",
  "weather": "Rain",
  "timeOfDay": "Evening",
  "expectedDeliveryTime": "14:30"
}

Response (200)
{
  "success": true,
  "message": "Prediction generated successfully.",
  "deliveryId": "DEL-1711111111111-123",
  "risk": "High",
  "delayMinutes": 77,
  "updatedDeliveryTime": "15:47",
  "reasons": [
    "High traffic detected.",
    "Rain may slow down delivery speed.",
    "Long travel distance increases disruption risk.",
    "Evening slot often has heavier traffic.",
    "Combined impact: High traffic with rain."
  ],
  "suggestions": [
    "Use an alternate route to avoid congestion.",
    "Add buffer time for weather-related delays.",
    "Dispatch earlier for long-distance deliveries.",
    "Consider rerouting and informing customer proactively."
  ]
}

3) Delivery Status
GET /status/DEL-1711111111111-123

Response (200)
{
  "success": true,
  "deliveryId": "DEL-1711111111111-123",
  "risk": "High",
  "delayMinutes": 77,
  "updatedDeliveryTime": "15:47",
  "reasons": ["..."],
  "suggestions": ["..."]
}
*/
