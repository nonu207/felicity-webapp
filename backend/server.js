require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

// Routes

const authRoutes = require('./routes/auth'); 
app.use('./api/auth', authRoutes); 
// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MERN API' });
});




