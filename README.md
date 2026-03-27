# 🚀 SupplyIQ – Smart Supply Chain Disruption Prediction System

## 📖 Overview

SupplyIQ is a web-based prototype designed to help logistics planners predict and prevent delivery disruptions before dispatch. The system analyzes multiple real-world factors such as distance, traffic, weather, and time of day to estimate delay risks and optimize delivery routes.

It provides a dual-dashboard experience for both planners and customers, ensuring transparency, efficiency, and smarter decision-making in supply chain operations.

---

## 🎯 Objectives

* Predict delivery delay risk (Low / Medium / High)
* Estimate delay time
* Suggest optimal delivery routes
* Provide reasons for delays
* Enable proactive decision-making
* Improve customer transparency and satisfaction

---

## 👥 User Profiles

### 👨‍💼 Planner Dashboard (Company)

* Input delivery details (From → To)
* View map with:

  * Best route (AI suggested)
  * Alternative routes
* Dynamic route analysis:

  * Risk level
  * Estimated delay
  * Route history
  * Order status
* Select or override AI-recommended route
* Confirm route selection
* View customer actions (e.g., delay compensation claims)

---

### 👤 Customer Dashboard

* 📍 Live order tracking using map
* ⏱ View:

  * Expected Arrival Time (ETA)
  * Delay duration
  * Current delivery status
* 💸 Dynamic pricing insights:

  * Increased charges for faster delivery
* 📊 Delivery trends page:

  * Upcoming busy days
  * Predicted increase in delivery charges

---

### 🎁 Delay Compensation Feature

* If delay exceeds 20 minutes:

  * Customer is eligible for a percentage refund
  * Claim option available in dashboard
* Once claimed:

  * Updates reflected in planner dashboard
  * Delivery record adjusted accordingly

---

## 🧠 System Functionality

### Inputs:

* Distance
* Traffic conditions
* Weather data
* Time of day
* Expected delivery time

### Processing:

* Weighted scoring model (AI-like logic)
* Multi-factor risk evaluation

### Outputs:

* Risk level
* Estimated delay
* Updated delivery time
* Cause of delay
* Smart recommendations

---

## 🔄 System Workflow

1. Planner inputs route details
2. System analyzes multiple routes
3. AI suggests the best route
4. Planner confirms or selects alternative route
5. Selected route is shared with customer dashboard
6. Customer tracks delivery live
7. If delay > 20 minutes → compensation option appears
8. Customer claim updates planner dashboard

---

## ⚙️ Tech Stack

### Frontend:

* HTML
* CSS
* JavaScript

### Backend:

* Node.js (Express)

### APIs:

* Google Maps API (routing & tracking)
* Weather API (delay prediction)

### Database (Prototype):

* JSON file (dummy database using Node.js fs module)

### Version Control:

* GitHub (with structured commits and changelog)

---

## 📁 Project Structure



## ✨ Key Features

* Multi-factor delay prediction
* AI-based route suggestion (simulated)
* Interactive map with route switching
* Live delivery tracking (simulated)
* Explainable results
* Dynamic pricing insights
* Delay compensation system

---

## 🔧 Hackathon Workflow

* Regular GitHub commits
* `/progress/` folder for screenshots and updates
* `CHANGELOG.md` to track feature additions

---

## 📌 Outcome

SupplyIQ demonstrates how intelligent systems can proactively manage supply chain disruptions, reduce delays, and improve overall delivery efficiency while enhancing customer experience.

---

## 🚧 Future Enhancements

* Real-time database integration (Firebase/MongoDB)
* Machine learning-based prediction models
* Real-time GPS tracking
* Push notifications for customers
* Advanced analytics dashboard

---

## 👩‍💻 Team 13
* Meenakshi Menon
* Rajalakshmi R
* Jiya Joe Palathinkal

---
