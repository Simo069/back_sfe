const express = require("express");
const http = require("http");
const cors = require('cors');
const { keycloak, memoryStore } = require('./config/keycloak');
require('dotenv').config();
const session = require('express-session');




// init app
const app = express();


const authRoutes = require('./routes/auth');
const demandeRoutes = require('./routes/demandes');
const {requireAdmin , requireManager , requireUser , hasRole} = require('./middleware/roleMiddlewar');


// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));

    // Session middleware (required for Keycloak)
app.use(session({
  // secret: process.env.SESSION_SECRET,
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));



  // Initialize Keycloak
  app.use(keycloak.middleware());


app.use(express.json({limit : '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/demandes', demandeRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});



module.exports=app;