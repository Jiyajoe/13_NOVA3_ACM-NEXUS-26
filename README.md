# SupplyIQ - Smart Supply Chain Disruption Prediction System

## Overview
SupplyIQ is a hackathon-ready web prototype for predicting delivery disruption before dispatch.
It includes:
- Planner dashboard for route analysis and route confirmation.
- Customer dashboard for delivery tracking.
- Rule-based delay prediction using weather, traffic, distance, and time-of-day factors.

## What Has Been Done

### Core Application
- Login system for two roles: planner and customer.
- Planner route analysis flow with map-based route comparison.
- Delay prediction output per route:
- Delay Level (Low/Medium/High)
- Delay Minutes
- Updated ETA
- Reasons list
- Best route recommendation and route confirmation flow.
- Customer tracking using delivery ID.

### API Integrations and Prediction Updates
- Weather API integration (OpenWeather).
- Traffic API integration (TomTom route traffic delay) with fallback logic.
- Prediction engine now fetches traffic and weather automatically (manual traffic/weather inputs removed).
- Route comparison API accepts coordinates and predicts each route asynchronously.
- Reasons now include explicit traffic and weather status.

### Frontend/UI Updates Already Completed
- Removed manual traffic and weather selectors from planner inputs.
- Kept planner inputs focused on:
- Origin
- Destination
- Time of day
- Expected delivery time
- Updated labels and copy to use Delay Level terminology.
- Added customer add-on module: Smart Delivery Pricing and Busy Days Prediction.
- Includes modal-based calendar, traffic-level indicator, estimated charge, and reason panel.

## Not Done Yet (Future Scope)
- Persistent database integration (currently in-memory runtime storage).
- Real authenticated user/session management.
- Real-time live vehicle GPS streaming.
- Auto-refresh delivery progress from real telematics feed.
- Delay compensation claim workflow end-to-end (business rules + persistence + planner approval flow).
- Admin analytics dashboard (historical trends and SLA reporting).
- ML-based prediction beyond rule-based scoring.
- Production-grade API key security hardening and secret rotation.
- Notification channels (SMS/email/push).

## Smart Delivery Pricing and Busy Days - Current Rule Logic
- Base delivery charge: normal rate.
- Weekend surcharge: +10%.
- Evening peak (5 PM to 9 PM): +15%.
- Holiday/Festival: +25%.
- Combined surcharge cap: +40% maximum.
- Predicted traffic level:
- Low (normal)
- Medium (weekend or moderate overlap)
- High (holiday and/or heavy overlap)

## Tech Stack
- Frontend: HTML, CSS, JavaScript.
- Backend: Node.js, Express.
- APIs: OpenWeather, TomTom Routing Traffic, Nominatim geocoding, OSRM routing.
- Storage: In-memory arrays/objects (prototype mode).

## Project Structure
```text
13_NOVA3_ACM-NEXUS-26/
|-- AGENTS.md
|-- CHANGELOG.md
|-- README.md
|-- index.html
|-- server.js
|-- order.json
|-- package.json
|-- package-lock.json
|-- .env
|-- .gitignore
|-- progress/
|   |-- .gitkeep
|-- node_modules/
```

## Run Locally
```bash
npm install
npm start
```
Server starts at `http://localhost:3000`.

## Hackathon Notes
- Kept implementation beginner-friendly and fast to run.
- Minimal dependencies and simple rule-based logic.
- Non-intrusive UI additions were implemented as modular popup/add-on patterns.

## Team 13
- Meenakshi Menon
- Rajalakshmi R
- Jiya Joe Palathinkal
