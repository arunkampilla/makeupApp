const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

/* -------------------------
   TEMP IN-MEMORY DATABASE
-------------------------- */

let clients = [];

/* -------------------------
   API ROUTES
-------------------------- */

// GET clients
app.get('/api/clients', (req, res) => {
  res.json(clients);
});

// ADD client
app.post('/api/clients', (req, res) => {
  const newClient = {
    id: Date.now().toString(),
    name: req.body.name || '',
    phone: req.body.phone || '',
    email: req.body.email || '',
    notes: req.body.notes || '',
    created_at: new Date().toISOString(),
  };

  clients.push(newClient);

  res.json(newClient);
});

// UPDATE client
app.put('/api/clients/:id', (req, res) => {
  const { id } = req.params;

  clients = clients.map((client) =>
    client.id === id
      ? {
          ...client,
          ...req.body,
        }
      : client
  );

  res.json({ success: true });
});

// DELETE client
app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;

  clients = clients.filter((client) => client.id !== id);

  res.json({ success: true });
});

/* -------------------------
   FRONTEND
-------------------------- */

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
/* -------------------------
   SERVER
-------------------------- */

const PORT = process.env.PORT || 8081;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});