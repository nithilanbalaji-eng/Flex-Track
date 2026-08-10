import { env } from "../config/env";

/**
 * Outbound email.
 *
 * Uses Resend when an API key is configured — chosen because it needs no SDK
 * (a plain HTTPS call) and has a usable free tier. When no provider is set the
 * message is logged to the server console instead of being dropped silently,
 * so password reset works during local development without any signup.
 */

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendViaResend(mail: Mail): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.mailFrom,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });

    if (!response.ok) {
      console.error("Resend rejected the email", response.status, await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to reach the email provider", err);
    return false;
  }
}

export async function sendMail(mail: Mail): Promise<boolean> {
  if (env.resendApiKey) return sendViaResend(mail);

  // No provider configured: surface the message so development still works.
  console.log(
    [
      "",
      "─".repeat(72),
      "EMAIL NOT SENT — no email provider configured (set RESEND_API_KEY).",
      `To:      ${mail.to}`,
      `Subject: ${mail.subject}`,
      "",
      mail.text,
      "─".repeat(72),
      "",
    ].join("\n")
  );
  return false;
}

/** Branded HTML wrapper so reset emails don't look like spam. */
function layout(heading: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#1a6ff5;padding:20px 24px;">
        <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.02em;">Flex Track</span>
      </div>
      <div style="padding:28px 24px;">
        <h1 style="margin:0 0 12px;font-size:19px;color:#0b1220;">${heading}</h1>
        <div style="font-size:15px;line-height:1.6;color:#475569;">${body}</div>
        ${
          cta
            ? `<a href="${cta.url}" style="display:inline-block;margin-top:22px;background:#1a6ff5;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;font-size:15px;">${cta.label}</a>
               <p style="margin-top:22px;font-size:13px;color:#94a3b8;line-height:1.5;">
                 If the button doesn't work, paste this into your browser:<br>
                 <span style="color:#64748b;word-break:break-all;">${cta.url}</span>
               </p>`
            : ""
        }
      </div>
    </div>
    <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#94a3b8;text-align:center;">
      Flex Track — train together, track everything.
    </p>
  </body>
</html>`;
}

export function passwordResetEmail(resetUrl: string, expiryMinutes: number): Omit<Mail, "to"> {
  const text = [
    "Reset your Flex Track password",
    "",
    `Open this link to choose a new password. It expires in ${expiryMinutes} minutes and can only be used once:`,
    resetUrl,
    "",
    "If you didn't ask for this, you can ignore this email — your password won't change.",
  ].join("\n");

  return {
    subject: "Reset your Flex Track password",
    text,
    html: layout(
      "Reset your password",
      `<p style="margin:0 0 8px;">Tap the button below to choose a new password. This link expires in
       <strong>${expiryMinutes} minutes</strong> and can only be used once.</p>
       <p style="margin:12px 0 0;">If you didn't ask for this, you can safely ignore this email — your
       password won't change.</p>`,
      { label: "Choose a new password", url: resetUrl }
    ),
  };
}

/** Sent when someone requests a reset for an account that uses Google/Apple sign-in. */
export function oauthAccountEmail(provider: string, loginUrl: string): Omit<Mail, "to"> {
  const label = provider === "google" ? "Google" : provider === "apple" ? "Apple" : provider;
  const text = [
    "About your Flex Track account",
    "",
    `Someone asked to reset the password for this email, but your account signs in with ${label} —`,
    "it doesn't have a password to reset.",
    "",
    `Just use "Continue with ${label}" on the sign-in screen: ${loginUrl}`,
  ].join("\n");

  return {
    subject: "About your Flex Track account",
    text,
    html: layout(
      "No password to reset",
      `<p style="margin:0;">Someone asked to reset the password for this email, but your account signs in
       with <strong>${label}</strong> — there's no password on it.</p>
       <p style="margin:12px 0 0;">Use the "Continue with ${label}" button on the sign-in screen instead.</p>`,
      { label: "Go to sign in", url: loginUrl }
    ),
  };
}
