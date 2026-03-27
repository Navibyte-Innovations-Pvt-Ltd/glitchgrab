export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_FROM,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Glitchgrab Contact" <${process.env.MAIL_FROM}>`,
      to: "bhosalenaresh73@gmail.com",
      replyTo: email,
      subject: `Glitchgrab Contact: ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; padding: 20px; max-width: 500px;">
          <h2 style="margin: 0 0 16px;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="background: #f4f4f5; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${message}</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;" />
          <p style="font-size: 12px; color: #71717a;">Sent from glitchgrab.dev contact form</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 }
    );
  }
}
