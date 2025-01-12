import { Resend } from 'resend';
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../prisma";
import { User } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendVerificationEmail({user}: {user: User}) {
    // Generate a confirmation token
    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000);
    await prisma.signupToken.create({
      data: {
        userId: user.id,
        token,
        expires,
      },
    });

  // Send confirmation email
  const confirmUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email?token=${token}`;
  const message = {
    from: `Prepity <no-reply@${process.env.RESEND_DOMAIN}>`,
    to: [user.email],
    subject: "Verify your email | Prepity",
    text: `Hi ${user.name},

We're excited to have you join Prepity!

To get started, please verify your email address - ${confirmUrl}

Best regards,
The Prepity Team`,
    html: `
        <p>Hi ${user.name},</p>
        <p>We're excited to have you join us!</p>
        <p>To get started, please verify your email address - <a href="${confirmUrl}">Verify email</a></p>
        <p>Best regards,<br>The Prepity Team</p>
    `,
  };

  await resend.emails.send(message);
}
