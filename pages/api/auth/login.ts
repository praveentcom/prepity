import { sendVerificationEmail } from "@/lib/server/auth/sendVerificationEmail";
import { prisma } from "@/lib/server/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

// Validation schema
const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must not exceed 32 characters")
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Validate input
    const validatedData = LoginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Use vague message for security
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailVerified) {
        const signupToken = await prisma.signupToken.findFirst({
            where: {
                userId: user.id,
                expires: {
                    gte: new Date()
                }
            }
        })

        if (!signupToken) {
            await prisma.signupToken.deleteMany({
                where: {
                    userId: user.id
                }
            });

            await sendVerificationEmail({ user });

            return res.status(403).json({ message: "Email not verified. A new verification email has been sent." });
        } else {
            return res.status(403).json({ message: "Verify your email to login." });
        }
    }

    const isValidPassword = await bcrypt.compare(password, user.password || '');

    if (!isValidPassword) {
      // Use same vague message for security
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Create a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=86400`);

    res.status(200).json({ token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors.map(err => err.message)
      });
    }

    console.error("Login error:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
}
