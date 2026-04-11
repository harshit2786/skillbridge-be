import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
function formatDate(date) {
    return date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
    });
}
// Sent to the trainer who was assigned as host
export async function sendHostInviteEmail(payload) {
    await resend.emails.send({
        from: FROM,
        to: payload.toEmail,
        subject: `You're hosting a webinar: ${payload.webinarTitle}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#059669">Webinar Host Invitation</h2>
        <p>Hi ${payload.trainerName},</p>
        <p>You have been assigned as the host for the following webinar:</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr>
            <td style="padding:8px 12px;font-weight:600;color:#374151;width:140px">Title</td>
            <td style="padding:8px 12px;color:#111827">${payload.webinarTitle}</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:8px 12px;font-weight:600;color:#374151">Date &amp; Time</td>
            <td style="padding:8px 12px;color:#111827">${formatDate(payload.scheduledAt)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:600;color:#374151">Duration</td>
            <td style="padding:8px 12px;color:#111827">${payload.duration} minutes</td>
          </tr>
        </table>
        <p>Use the link below to start the meeting when you're ready:</p>
        <a href="${payload.startUrl}"
           style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Start Webinar
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          This link is unique to you as the host. Do not share it with attendees.
        </p>
      </div>
    `,
    });
}
// Sent to a trainee after they register
export async function sendRegistrationConfirmEmail(payload) {
    const greeting = payload.traineeName ? `Hi ${payload.traineeName},` : "Hi,";
    await resend.emails.send({
        from: FROM,
        to: payload.toEmail,
        subject: `You're registered: ${payload.webinarTitle}`,
        html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#059669">Webinar Registration Confirmed</h2>
        <p>${greeting}</p>
        <p>You have successfully registered for the following webinar:</p>
        <table style="border-collapse:collapse;width:100%;margin:16px 0">
          <tr>
            <td style="padding:8px 12px;font-weight:600;color:#374151;width:140px">Title</td>
            <td style="padding:8px 12px;color:#111827">${payload.webinarTitle}</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:8px 12px;font-weight:600;color:#374151">Date &amp; Time</td>
            <td style="padding:8px 12px;color:#111827">${formatDate(payload.scheduledAt)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:600;color:#374151">Duration</td>
            <td style="padding:8px 12px;color:#111827">${payload.duration} minutes</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:8px 12px;font-weight:600;color:#374151">Host</td>
            <td style="padding:8px 12px;color:#111827">${payload.hostName}</td>
          </tr>
        </table>
        <p>Use the link below to join when the webinar starts:</p>
        <a href="${payload.joinUrl}"
           style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Join Webinar
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          Save this email — you'll need this link to join the session.
        </p>
      </div>
    `,
    });
}
//# sourceMappingURL=email.js.map