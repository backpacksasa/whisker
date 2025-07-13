const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Basic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WhiskerSwap API is running' });
});

app.get('/api/tokens', (req, res) => {
  res.json([
    { symbol: 'HYPE', name: 'Hyperliquid', price: '48.50' },
    { symbol: 'PURR', name: 'Purr Token', price: '0.22' },
    { symbol: 'WHYPE', name: 'Wrapped HYPE', price: '48.50' }
  ]);
});

// Serve static files
app.use(express.static('public'));

// Catch all - serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
