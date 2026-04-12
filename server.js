const express = require('express');
const app = express();

app.use(express.static('public')); // serves your frontend

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});