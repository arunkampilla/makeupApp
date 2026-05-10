const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

let clients = [];

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.send("OK");
});

// GET CLIENTS
app.get("/api/clients", (req, res) => {
  console.log("GET /api/clients called");
  res.json(clients);
});

// ADD CLIENT
app.post("/api/clients", (req, res) => {
  console.log("POST BODY:", req.body);

  const newClient = {
    id: Date.now().toString(),
    name: req.body.name || "",
    phone: req.body.phone || "",
    email: req.body.email || "",
    notes: req.body.notes || "",
    created_at: new Date().toISOString(),
  };

  clients.push(newClient);

  console.log("CLIENTS:", clients);

  res.status(201).json(newClient);
});

// SERVE FRONTEND
app.use(express.static(path.join(__dirname, "dist")));

// FALLBACK
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});