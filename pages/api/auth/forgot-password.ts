import { prisma } from "@/lib/server/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/server/auth/sendPasswordResetEmail";

const ForgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const validatedData = ForgotPasswordSchema.parse(req.body);
        const { email } = validatedData;

        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            // Delete any existing reset tokens for this user
            await prisma.passwordResetToken.deleteMany({
                where: { userId: user.id }
            });

            await sendPasswordResetEmail({ user });
        }

        // Always return success to prevent email enumeration
        res.status(200).json({ 
            message: "If an account exists with this email, you will receive password reset instructions." 
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.errors.map(err => err.message)
            });
        }

        console.error("Password reset request error:", error);
        res.status(500).json({ message: "An error occurred" });
    }
} 