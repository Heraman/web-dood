// server.js
require('dotenv').config(); // Muat variabel dari .env
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const indexRoutes = require('./routes/index');
const videoRoutes = require('./routes/video');

const app = express();
const port = process.env.PORT || 3000; // Gunakan port dari env atau default 3000

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); // Sajikan file statis (CSS, JS Klien)
app.use(bodyParser.urlencoded({ extended: true })); // Parsing body form URL-encoded
app.use(bodyParser.json()); // Parsing body JSON (jika diperlukan)

// Routes
app.use('/', indexRoutes);
app.use('/video', videoRoutes); // Rute terkait video (player, upload)

// Error handling sederhana (bisa dikembangkan)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Terjadi Kesalahan!');
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});