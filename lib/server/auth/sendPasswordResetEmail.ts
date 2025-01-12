import { Resend } from 'resend';
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../prisma";
import { User } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendPasswordResetEmail({user}: {user: User}) {
    // Generate a reset token
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // 1 hour expiry

    await prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            token,
            expires,
        },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/new-password?token=${token}`;
    const message = {
        from: `Prepity <no-reply@${process.env.RESEND_DOMAIN}>`,
        to: [user.email],
        subject: "Password Reset Request | Prepity",
        text: `Hi ${user.name},

We received a request to reset your password for your Prepity account.

Use this link to create a new password - ${resetUrl}

Best regards,
The Prepity Team`,
        html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password for your Prepity account.</p>
        <p>Use this link to create a new password - <a href="${resetUrl}">Reset password</a></p>
        <p>Best regards,<br>The Prepity Team</p>
    `,
    };

    await resend.emails.send(message);
} 