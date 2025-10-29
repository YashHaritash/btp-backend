const jwt = require("jsonwebtoken");

const loginRequired = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  // Handle both "Bearer token" and direct token formats
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "yashisagoodboy"
    );
    req.user = decoded;
    next();
  } catch (ex) {
    console.error("Token verification error:", ex);
    res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = loginRequired;
