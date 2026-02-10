const express = require('express'); 
const cors = require('cors'); 
const jwt = require('jsonwebtoken'); 
const User = require('../models/User.js'); 
// require(dotenv.config()); 
app.use(express.json()); 

const registerParticipant = async(req, res) => {
  try{
    const {
        firstName,
        lastName, 
        email, 
        password, 
        participantType, 
        college, 
        contactNumber
    } = req.body; 
    if(!email || !password){
      return res.status(400).json({message: "missing fields"}); 
    }
    if(participantType == "IIIT"){
      if(!email.endswith("@iiit.ac.in")){
        return res.status(400).json({message: "IIIT participants must use IIIT-email"}); 
      }
    }
    const exists = await User.findOne({email});
   if(exists){
    return res.status(400).json({message: "User already exists"}); 
   }
   const hashed = await bcrypt.hash(password, 10); 
   const user = await User.create({
    firstName, 
    
   })
  }
}; 