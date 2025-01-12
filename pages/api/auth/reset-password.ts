import { prisma } from "@/lib/server/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import bcrypt from "bcryptjs";

const ResetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(32, "Password must not exceed 32 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const validatedData = ResetPasswordSchema.parse(req.body);
        const { token, password } = validatedData;

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken || resetToken.expires < new Date()) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update the user's password
        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
        });

        // Delete the used token
        await prisma.passwordResetToken.delete({
            where: { id: resetToken.id }
        });

        res.status(200).json({ message: "Password reset successful" });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: "Validation failed",
                errors: error.errors.map(err => err.message)
            });
        }

        console.error("Password reset error:", error);
        res.status(500).json({ message: "An error occurred" });
    }
} 