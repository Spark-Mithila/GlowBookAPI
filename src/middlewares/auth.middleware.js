const { auth } = require("../utils/firebase");

/**
 * Middleware to verify Firebase ID token
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: No token provided",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach the user information to the request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...decodedToken,
    };

    next();
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid token",
    });
  }
};

/**
 * Middleware to check if user has superadmin role
 */
const superadminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "superadmin") {
    next();
  } else {
    return res.status(403).json({
      status: "error",
      message: "Forbidden: Superadmin access required",
    });
  }
};

module.exports = {
  authMiddleware,
  superadminMiddleware,
};
