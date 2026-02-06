const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
router.get('./hello', (req,res)=> {
    const data = res.json({message:'route working  perfectly'}); 
    res.json(data); 
})

//sign-up data(get)
router.post('./register', (req, res)=> {
    res.json({message:'setting this up later'}); 
})

//login data 
router.post('./login', (req, res)=> {
    res.json({message: "setting up later"}); 
})

