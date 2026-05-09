const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

// TEMP in-memory storage
let clients = [];

// GET clients
app.get("/api/clients", (req, res) => {
  res.json(clients);
});

// ADD client
app.post("/api/clients", (req, res) => {
  const newClient = {
    id: Date.now().toString(),
    ...req.body,
    created_at: new Date().toISOString(),
  };

  clients.push(newClient);

  res.status(201).json(newClient);
});

// UPDATE client
app.put("/api/clients/:id", (req, res) => {
  clients = clients.map((client) =>
    client.id === req.params.id
      ? { ...client, ...req.body }
      : client
  );

  res.json({ success: true });
});

// DELETE client
app.delete("/api/clients/:id", (req, res) => {
  clients = clients.filter(
    (client) => client.id !== req.params.id
  );

  res.json({ success: true });
});

// Serve Expo web build
app.use(express.static(path.join(__dirname, "dist")));

// React/Expo Router fallback
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 8081;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on ${port}`);
});