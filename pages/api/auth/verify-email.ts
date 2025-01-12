import { prisma } from "@/lib/server/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

// Validation schema
const VerifyEmailSchema = z.object({
  token: z.string().uuid("Invalid token format").min(1, "Token is required"),
});

type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Validate input
    const validatedData = VerifyEmailSchema.parse(req.body) as VerifyEmailInput;
    const { token } = validatedData;

    // Find the signup token
    const signupToken = await prisma.signupToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!signupToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Check if token is expired
    if (signupToken.expires < new Date()) {
      return res.status(400).json({ message: "Token has expired" });
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { id: signupToken.userId },
      data: { emailVerified: true },
    });

    // Delete the used token
    await prisma.signupToken.delete({
      where: { id: signupToken.id },
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors.map(err => err.message)
      });
    }

    console.error("Email verification error:", error);
    return res.status(500).json({ message: "An error occurred during email verification" });
  }
}
