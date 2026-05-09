const express = require("express");
const path = require("path");

const app = express();

// MUST be BEFORE routes
app.use(express.json());

let clients = [];

// GET
app.get("/api/clients", (req, res) => {
  res.json(clients);
});

// POST
app.post("/api/clients", (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const newClient = {
      id: Date.now().toString(),
      name: req.body?.name || "",
      phone: req.body?.phone || "",
      email: req.body?.email || "",
      notes: req.body?.notes || "",
      created_at: new Date().toISOString(),
    };

    clients.push(newClient);

    console.log("CLIENT ADDED:", newClient);

    res.status(201).json(newClient);
  } catch (err) {
    console.error("POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// static
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback (IMPORTANT FIX - regex correct)
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 8081;
app.listen(port, "0.0.0.0", () => {
  console.log("Server running on", port);
});