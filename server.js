const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

// Temporary in-memory storage
let clients = [];

// GET all clients
app.get("/api/clients", (req, res) => {
  try {
    res.json(clients);
  } catch (err) {
    console.error("GET CLIENTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ADD client
app.post("/api/clients", (req, res) => {
  try {
    console.log("BODY:", req.body);

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
    console.error("POST CLIENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE client
app.put("/api/clients/:id", (req, res) => {
  try {
    clients = clients.map((client) =>
      client.id === req.params.id
        ? { ...client, ...req.body }
        : client
    );

    res.json({ success: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE client
app.delete("/api/clients/:id", (req, res) => {
  try {
    clients = clients.filter(
      (client) => client.id !== req.params.id
    );

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, "dist")));

// Fallback for Expo Router / React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 8081;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});