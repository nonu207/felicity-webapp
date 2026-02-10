const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 

const participantSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true, 
    }, 
    firstName: {
        type: String, 
        required: true, 
        trim: true
    }, 
    lastName:{ 
        type: String, 
        required: true, 
        trim: true
    }, 
    interests: [{
        type: String
    }], 
    profileComplete:{
        type: Boolean, 
        default: false
    },
    participantType: {
  type: String,
  enum: ['IIIT', 'NON_IIIT'],
  required: true
},

collegeName: {
  type: String,
  required: true,
  trim: true
},

contactNumber: {
  type: String,
  required: true
}

}, 
{
    timestamps: true
}); 

module.exports = mongoose.model('Participant', participantSchema); 