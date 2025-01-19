import { sendVerificationEmail } from "@/lib/server/auth/sendVerificationEmail";
import { prisma } from "@/lib/server/prisma";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next/types";
import { z } from "zod";

// Validation schema
const SignupSchema = z.object({
  name: z.string().max(48).regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must not exceed 32 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
});

const MAX_SIGNUPS = process.env.MAX_SIGNUPS_PER_DAY ? parseInt(process.env.MAX_SIGNUPS_PER_DAY) : 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Validate input
    const validatedData = SignupSchema.parse(req.body);
    const { name, email, password } = validatedData;

    // Check signup limit
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const signupsToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: midnight
        }
      }
    });

    if (signupsToday >= MAX_SIGNUPS) {
      return res.status(429).json({ 
        message: "Maximum number of signups for today has been reached. Please try again tomorrow." 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Use vague message for security
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Hash the password with strong salt rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user in the database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    await prisma.userPreference.create({
        data: {
          userId: user.id,
        },
    });

    await sendVerificationEmail({ user });

    res.status(201).json({ 
      message: "Signup successful. Please check your email to confirm your account." 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors.map(err => err.message)
      });
    }

    console.error("Signup error:", error);
    res.status(500).json({ message: "An error occurred during signup" });
  }
}
