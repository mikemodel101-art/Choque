/*
 * lib/emails.ts — transactional email templates.
 * Why: spec 5.8 lists seven lifecycle emails. Each is a pure function
 * returning { subject, text, html } so the same template renders in the
 * Resend/Supabase SMTP call AND in the in-app preview (admin → Emails), with
 * no database or network required in this demo build.
 */

export type EmailKind =
  | "welcome"
  | "verify"
  | "reset"
  | "request_received"
  | "request_accepted"
  | "listing_approved"
  | "listing_rejected"
  | "mat_reminder";

export interface EmailPayload {
  name?: string;
  actionUrl?: string;
  partnerName?: string;
  listingName?: string;
  reason?: string;
}

export interface RenderedEmail {
  kind: EmailKind;
  label: string;
  subject: string;
  text: string;
  html: string;
}

const BRAND = "CHOQUE";
const FOOT = `You're receiving this because you have a ${BRAND} account. Manage emails in your profile settings.`;

function shell(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#FAFAF9;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1917">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #E7E5E4;border-radius:16px">
      <tr><td style="padding:28px 28px 0">
        <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#B91C1C">${BRAND}</p>
        <h1 style="margin:14px 0 0;font-size:22px;line-height:1.25;letter-spacing:-.02em">${title}</h1>
      </td></tr>
      <tr><td style="padding:14px 28px 0;font-size:15px;line-height:1.6;color:#44403C">${body}</td></tr>
      ${cta ? `<tr><td style="padding:24px 28px 0">
        <a href="${cta.url}" style="display:inline-block;background:#B91C1C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">${cta.label}</a>
      </td></tr>` : ""}
      <tr><td style="padding:28px;border-top:1px solid #E7E5E4;margin-top:24px">
        <p style="margin:24px 0 0;font-size:12px;color:#78716C">${FOOT}</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export function renderEmail(kind: EmailKind, p: EmailPayload = {}): RenderedEmail {
  const name = p.name ?? "there";
  const url = p.actionUrl ?? "https://choque.app";

  switch (kind) {
    case "welcome":
      return {
        kind, label: "Welcome",
        subject: `Welcome to ${BRAND} — find your mat family`,
        text: `Hi ${name},\n\nWelcome to CHOQUE. Find gyms, line up open mats, meet training partners, and keep a private notebook.\n\nStart here: ${url}`,
        html: shell("Welcome to CHOQUE",
          `<p>Hi ${name},</p><p>You're in. Find academies near you, reserve a spot at this weekend's open mat, and start the notebook your future black belt will thank you for.</p>`,
          { label: "Find your gym", url }),
      };
    case "verify":
      return {
        kind, label: "Verify email",
        subject: "Confirm your email address",
        text: `Confirm your CHOQUE email: ${url}\n\nThis link expires in 24 hours.`,
        html: shell("Confirm your email",
          `<p>Tap the button to verify this address. Submitting gyms and open mats unlocks once you're verified.</p><p style="color:#78716C;font-size:13px">The link expires in 24 hours.</p>`,
          { label: "Verify email", url }),
      };
    case "reset":
      return {
        kind, label: "Password reset",
        subject: "Reset your CHOQUE password",
        text: `Reset your password: ${url}\n\nIf you didn't ask for this, ignore this email — nothing changes.`,
        html: shell("Reset your password",
          `<p>Choose a new password using the button below.</p><p style="color:#78716C;font-size:13px">Didn't request this? Ignore this email — your password stays the same.</p>`,
          { label: "Choose a new password", url }),
      };
    case "request_received":
      return {
        kind, label: "Request received",
        subject: `${p.partnerName ?? "Someone"} wants to train with you`,
        text: `${p.partnerName ?? "A practitioner"} sent you a connection request on CHOQUE.\n\nReview it: ${url}`,
        html: shell("You have a training request",
          `<p><strong>${p.partnerName ?? "A practitioner"}</strong> would like to train with you. Accept to share contact details, or decline — they're never told who declined.</p>`,
          { label: "Open your requests", url }),
      };
    case "request_accepted":
      return {
        kind, label: "Request accepted",
        subject: `${p.partnerName ?? "Your request"} accepted — contact details unlocked`,
        text: `${p.partnerName ?? "Your partner"} accepted your request. You can now see each other's chosen contact details.\n\n${url}`,
        html: shell("You're connected",
          `<p><strong>${p.partnerName ?? "Your partner"}</strong> accepted your request. You can now see the contact details you each chose to share. Go set up a round.</p>`,
          { label: "View connection", url }),
      };
    case "listing_approved":
      return {
        kind, label: "Listing approved",
        subject: `${p.listingName ?? "Your listing"} is live on CHOQUE`,
        text: `Good news — ${p.listingName ?? "your listing"} was approved and is now public.\n\n${url}`,
        html: shell("Your listing is live",
          `<p>Thanks for contributing. <strong>${p.listingName ?? "Your listing"}</strong> passed review and is now visible to the community.</p>`,
          { label: "View listing", url }),
      };
    case "mat_reminder":
      return {
        kind, label: "Open-mat reminder",
        subject: `Tomorrow: ${p.listingName ?? "your open mat"}`,
        text: `Reminder — you reserved a spot at ${p.listingName ?? "an open mat"} tomorrow.\n\nDetails: ${url}\n\nCan't make it? Release your spot so someone else can roll.`,
        html: shell("You're on the mat tomorrow",
          `<p>Quick reminder: you reserved a spot at <strong>${p.listingName ?? "the open mat"}</strong> tomorrow.</p>
           <p style="color:#78716C;font-size:13px">Can't make it? Cancel your RSVP in CHOQUE so the spot opens up for someone else.</p>`,
          { label: "View my schedule", url }),
      };
    case "listing_rejected":
      return {
        kind, label: "Listing rejected",
        subject: `About your ${BRAND} submission`,
        text: `We couldn't publish ${p.listingName ?? "your submission"}.\n\nReason: ${p.reason ?? "It didn't meet our listing guidelines."}\n\nYou're welcome to edit and resubmit: ${url}`,
        html: shell("We couldn't publish this one",
          `<p>Thanks for submitting <strong>${p.listingName ?? "your listing"}</strong>. A moderator couldn't publish it as-is.</p>
           <p style="background:#FEE2E2;border-radius:8px;padding:12px 14px;color:#991B1B"><strong>Reason:</strong> ${p.reason ?? "It didn't meet our listing guidelines."}</p>
           <p>Edits are welcome — resubmit any time.</p>`,
          { label: "Edit and resubmit", url }),
      };
  }
}

export const ALL_EMAIL_KINDS: EmailKind[] = [
  "welcome", "verify", "reset", "request_received",
  "request_accepted", "listing_approved", "listing_rejected", "mat_reminder",
];
