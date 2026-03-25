import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_FROM,
    pass: process.env.MAIL_PASSWORD,
  },
});

export async function sendWelcomeEmail(email: string) {
  await transporter.sendMail({
    from: `"Glitchgrab" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: "You're on the Glitchgrab waitlist!",
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #09090b; color: #fafafa; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; margin: 0; color: #22d3ee;">Glitchgrab</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Grab the glitch. Ship the fix.</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">Hey there,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          You're on the list! We're building Glitchgrab — the tool that turns messy bug reports into clean GitHub issues using AI.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">Here's what happens next:</p>
        <ul style="font-size: 14px; line-height: 2; color: #a1a1aa;">
          <li>We'll email you when early access is ready</li>
          <li>Waitlist members get launch pricing locked in</li>
          <li>Your survey feedback directly shapes what we build first</li>
        </ul>
        <p style="font-size: 14px; color: #71717a; margin-top: 32px; text-align: center;">
          — Naresh, building Glitchgrab
        </p>
      </div>
    `,
  });
}

export async function notifyNewSignup(email: string) {
  await transporter.sendMail({
    from: `"Glitchgrab Waitlist" <${process.env.MAIL_FROM}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `New waitlist signup: ${email}`,
    html: `
      <div style="font-family: system-ui, sans-serif; padding: 20px;">
        <h2>New Waitlist Signup</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      </div>
    `,
  });
}

export async function sendCollaboratorInvite(
  email: string,
  ownerName: string,
  magicLink: string,
  repoNames: string[]
) {
  const repoList = repoNames
    .map((name) => `<li style="color: #a1a1aa; font-size: 14px;">${name}</li>`)
    .join("");

  await transporter.sendMail({
    from: `"Glitchgrab" <${process.env.MAIL_FROM}>`,
    to: email,
    subject: `${ownerName} invited you to report bugs on Glitchgrab`,
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #09090b; color: #fafafa; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; margin: 0; color: #22d3ee;">Glitchgrab</h1>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Grab the glitch. Ship the fix.</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">Hey there,</p>
        <p style="font-size: 16px; line-height: 1.6;">
          <strong>${ownerName}</strong> has invited you to report bugs on the following repositories:
        </p>
        <ul style="line-height: 2; padding-left: 20px;">
          ${repoList}
        </ul>
        <p style="font-size: 16px; line-height: 1.6;">
          Click the button below to accept the invitation and start reporting bugs. No GitHub account needed.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicLink}" style="display: inline-block; background: #22d3ee; color: #09090b; font-weight: 600; font-size: 16px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 12px; color: #71717a; text-align: center;">
          This link expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export async function notifySurveyResponse(
  email: string,
  survey: {
    priceFeel?: string | null;
    topFeature?: string | null;
    currentTool?: string | null;
    suggestion?: string | null;
  }
) {
  const rows = [
    ["Price Feel", survey.priceFeel],
    ["Top Feature", survey.topFeature],
    ["Current Tool", survey.currentTool],
    ["Suggestion", survey.suggestion],
  ]
    .filter(([, val]) => val)
    .map(([label, val]) => `<tr><td style="padding: 8px; color: #a1a1aa;">${label}</td><td style="padding: 8px;">${val}</td></tr>`)
    .join("");

  if (!rows) return;

  await transporter.sendMail({
    from: `"Glitchgrab Waitlist" <${process.env.MAIL_FROM}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `Survey response from ${email}`,
    html: `
      <div style="font-family: system-ui, sans-serif; padding: 20px;">
        <h2>Survey Response</h2>
        <p><strong>From:</strong> ${email}</p>
        <table style="border-collapse: collapse; margin-top: 16px;">
          ${rows}
        </table>
      </div>
    `,
  });
}
