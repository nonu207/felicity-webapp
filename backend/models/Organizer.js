const mongoose = require('mongoose'); 
const bcrypt = require('bcrypt');

const organizerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    }, 
    organizerName: {
        type: String, 
        required: true, 
        trim: true
    }, 
    organizerDescription: {
        type: String, 
        required: true, 
        trim: true
    }, 
    organizerCategory: {
        type: String, 
        required: true, 
        trim: true
    }, 
    contactEmail: {
        type: String, 
        required: true, 
        lowercase: true, 
        unique: true
    }},
    {
        timestamps: true
    }); 

    module.exports = mongoose.model('Organizer', organizerSchema); 