const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Participant = require('../models/Participant');
const Organizer = require('../models/Organizer');

const createOrganizer 