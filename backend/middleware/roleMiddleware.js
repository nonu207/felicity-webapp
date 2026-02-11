// This function receives allowed roles from the route
const roleMiddleware = (allowedRoles) => {

  return (req, res, next) => {

    // 1. Make sure user exists (set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        message: "User not authenticated"
      });
    }

    // 2. Check if user's role is in allowed list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: You don't have permission"
      });
    }

    // 3. If everything ok → continue
    next();
  };

};

module.exports = roleMiddleware;
