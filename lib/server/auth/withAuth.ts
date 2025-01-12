import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

declare module 'next' {
  interface NextApiRequest {
    user?: any;
  }
}

export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded;
      return handler(req, res);
    } catch (error) {
      return res.status(403).json({ message: "Invalid token" });
    }
  };
}
