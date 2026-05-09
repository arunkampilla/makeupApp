const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

let clients = [];

// API ROUTES
app.get("/api/clients", (req, res) => {
  res.json(clients);
});

app.post("/api/clients", (req, res) => {
  try {
    const newClient = {
      id: Date.now().toString(),
      ...req.body,
      created_at: new Date().toISOString(),
    };

    clients.push(newClient);
    res.status(201).json(newClient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STATIC FRONTEND
app.use(express.static(path.join(__dirname, "dist")));

// SAFE FALLBACK (NO path-to-regexp issues)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 8081;
app.listen(port, "0.0.0.0", () => {
  console.log("Server running on", port);
});