import nodemailer from "nodemailer";

const transporter =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: (process.env.SMTP_PORT || "587") === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const FROM = process.env.EMAIL_FROM || "Foodies <noreply@foodies.com>";

function isEmailEnabled(): boolean {
  return transporter !== null;
}

async function send(to: string, subject: string, html: string) {
  if (!isEmailEnabled()) {
    console.log(`[Email disabled] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter!.sendMail({ from: FROM, to, subject, html });
}

// ── Templates ──────────────────────────────────────────────

export async function sendBookingCreatedToChef(opts: {
  chefEmail: string;
  chefName: string;
  clientName: string;
  date: string;
  time: string;
  guestCount: number;
  total: number;
  bookingId: string;
}) {
  await send(
    opts.chefEmail,
    `New Booking Request — ${opts.clientName}`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0B0B0B;color:#F5F0E8;padding:40px;">
      <h1 style="color:#C8A96A;font-size:24px;margin:0 0 24px;">New Booking Request</h1>
      <p>Hello ${opts.chefName},</p>
      <p>${opts.clientName} has requested a private dining experience.</p>
      <table style="width:100%;margin:24px 0;border-collapse:collapse;">
        <tr><td style="color:#B8B0A2;padding:8px 0;">Date</td><td style="padding:8px 0;">${opts.date}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Time</td><td style="padding:8px 0;">${opts.time}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Guests</td><td style="padding:8px 0;">${opts.guestCount}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Total</td><td style="padding:8px 0;color:#C8A96A;font-weight:bold;">$${opts.total}</td></tr>
      </table>
      <p>Please log in to confirm or manage this booking.</p>
      <p style="color:#B8B0A2;font-size:12px;margin-top:32px;">— The Foodies Team</p>
    </div>
    `
  );
}

export async function sendBookingConfirmedToClient(opts: {
  clientEmail: string;
  clientName: string;
  chefName: string;
  date: string;
  time: string;
  address: string;
  total: number;
}) {
  await send(
    opts.clientEmail,
    `Booking Confirmed — Chef ${opts.chefName}`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0B0B0B;color:#F5F0E8;padding:40px;">
      <h1 style="color:#C8A96A;font-size:24px;margin:0 0 24px;">Booking Confirmed</h1>
      <p>Hello ${opts.clientName},</p>
      <p>Great news — Chef ${opts.chefName} has confirmed your private dining experience.</p>
      <table style="width:100%;margin:24px 0;border-collapse:collapse;">
        <tr><td style="color:#B8B0A2;padding:8px 0;">Date</td><td style="padding:8px 0;">${opts.date}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Time</td><td style="padding:8px 0;">${opts.time}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Location</td><td style="padding:8px 0;">${opts.address}</td></tr>
        <tr><td style="color:#B8B0A2;padding:8px 0;">Total</td><td style="padding:8px 0;color:#C8A96A;font-weight:bold;">$${opts.total}</td></tr>
      </table>
      <p style="color:#B8B0A2;font-size:12px;margin-top:32px;">— The Foodies Team</p>
    </div>
    `
  );
}

export async function sendBookingCompletedToClient(opts: {
  clientEmail: string;
  clientName: string;
  chefName: string;
}) {
  await send(
    opts.clientEmail,
    `How was your experience with Chef ${opts.chefName}?`,
    `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0B0B0B;color:#F5F0E8;padding:40px;">
      <h1 style="color:#C8A96A;font-size:24px;margin:0 0 24px;">Experience Complete</h1>
      <p>Hello ${opts.clientName},</p>
      <p>We hope you enjoyed your private dining experience with Chef ${opts.chefName}.</p>
      <p>We'd love to hear your feedback — log in to leave a review and help other diners discover great chefs.</p>
      <p style="color:#B8B0A2;font-size:12px;margin-top:32px;">— The Foodies Team</p>
    </div>
    `
  );
}
