const jwt = require('jsonwebtoken'); 
const User = require('../models/User.js');

const protect = async(req, res, next) => {
    let token; 
    
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1]; 
    }
    
    if(!token){
        return res.status(401).json({message: "Not authorized, no token"}); 
    }
    
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Your account has been deleted. Please contact support if you believe this is an error.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Your account has been deactivated by an administrator. Please contact support for assistance.' });
        }

        req.user = user;
        next(); 
    }
    catch(error){
        console.error(error); 
        res.status(401).json({message: "Not authorized, token failed"}); 
    }
}; 

// Like protect, but doesn't fail on missing/invalid token — just skips setting req.user
const optionalProtect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            // Only set req.user if account exists and is active
            if (user && user.isActive) {
                req.user = user;
            }
        } catch (_) {
            // invalid token — treat as unauthenticated
        }
    }
    next();
};

module.exports = { protect, optionalProtect };