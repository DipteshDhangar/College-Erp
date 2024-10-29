import jwt from "jsonwebtoken";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    let decodedData;
    try {
      decodedData = jwt.verify(token, "sEcReT");
      req.userId = decodedData?.id;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  } catch (error) {
    console.log("Authentication error:", error);
    res.status(500).json({ message: "Server error in authentication" });
  }
};

export default auth;
