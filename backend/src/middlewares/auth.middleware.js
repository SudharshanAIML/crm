import jwt from "jsonwebtoken";


export const authenticateEmployee = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    req.user = {
      empId: decoded.empId,
      companyId: decoded.companyId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
