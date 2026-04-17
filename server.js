const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "dist")));

const port = process.env.PORT || 8081;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});


//const PORT = process.env.PORT || 5000;
//
//app.listen(PORT, () => {
//  console.log("Server running on port", PORT);
//});


app.get('/*any', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
