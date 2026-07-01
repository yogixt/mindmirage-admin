/* Best-effort email via Resend */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;

  const icon = 
    subject.toLowerCase().includes("booking") || subject.toLowerCase().includes("confirm") ? "📅" :
    subject.toLowerCase().includes("welcome") || subject.toLowerCase().includes("login") ? "🔑" : "✉️";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#FAF8F5;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FAF8F5;padding:40px 16px;width:100%">
        <tr>
          <td align="center">
            <table width="100%" max-width="580px" style="max-width:580px;background-color:#ffffff;border:1px solid #EFECE6;border-radius:24px;box-shadow:0 12px 40px -12px rgba(192,83,31,0.06);overflow:hidden;border-collapse:separate" border="0" cellspacing="0" cellpadding="0">
              
              <!-- Brand Header -->
              <tr>
                <td style="padding:40px 40px 10px 40px;text-align:center">
                  <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#1D1B18;letter-spacing:-0.02em">
                    Mind Mirage<span style="color:#C0531F">.</span>
                  </div>
                  <div style="font-size:10px;font-weight:600;color:#8A857C;text-transform:uppercase;letter-spacing:0.2em;margin-top:6px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
                    Advaita Sadhana Kutir
                  </div>
                </td>
              </tr>

              <!-- Header Icon -->
              <tr>
                <td style="padding:20px 40px 10px 40px;text-align:center">
                  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto">
                    <tr>
                      <td style="background-color:#FFF6F2;border-radius:50%;width:64px;height:64px;text-align:center;vertical-align:middle;font-size:28px;color:#C0531F;line-height:64px">
                        ${icon}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td style="padding:0 40px 24px 40px;text-align:center">
                  <h2 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#C0531F;margin:0;letter-spacing:-0.01em">
                    ${subject}
                  </h2>
                  <div style="width:40px;height:2px;background-color:#C0531F;margin:16px auto 0 auto;border-radius:1px"></div>
                </td>
              </tr>

              <!-- Main Content Block -->
              <tr>
                <td style="padding:0 40px 24px 40px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;color:#1D1B18;line-height:1.6;text-align:left">
                  ${html}
                </td>
              </tr>

              <!-- Action Button -->
              <tr>
                <td style="padding:10px 40px 30px 40px;text-align:center">
                  <a href="https://mindmirageindia.com/dashboard" style="display:inline-block;background-color:#C0531F;color:#FFFFFF;font-family:Georgia,serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:30px;box-shadow:0 6px 20px rgba(192,83,31,0.15)">
                    Open Seeker Dashboard →
                  </a>
                </td>
              </tr>

              <!-- Help Callout Card -->
              <tr>
                <td style="padding:0 40px 40px 40px">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFF6F2;border:1px solid #FADED0;border-radius:16px;width:100%">
                    <tr>
                      <td style="padding:20px;text-align:center">
                        <p style="margin:0;font-family:Georgia,serif;font-size:15px;font-weight:700;color:#C0531F">
                          Advaita Sadhana Kutir
                        </p>
                        <p style="margin:6px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#7A5340;line-height:1.5">
                          If you have any questions or need to reach support, contact us at <a href="mailto:namaste@mindmirageindia.com" style="color:#C0531F;font-weight:700;text-decoration:none;border-bottom:1px solid #C0531F">namaste@mindmirageindia.com</a>.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer info -->
              <tr>
                <td style="background-color:#FAF8F5;padding:30px 40px;text-align:center;border-top:1px solid #EFECE6">
                  <p style="margin:0;font-size:12px;color:#8A857C;line-height:1.6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
                    This email notification was automatically sent from Mind Mirage.
                    <br />
                    © ${new Date().getFullYear()} Mind Mirage India. All rights reserved.
                  </p>
                  <div style="margin-top:16px;font-size:12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
                    <a href="https://mindmirageindia.com" style="color:#C0531F;text-decoration:none;font-weight:600;margin:0 8px">Website</a>
                    <span style="color:#D5D2C9">•</span>
                    <a href="https://mindmirageindia.com/dashboard" style="color:#C0531F;text-decoration:none;font-weight:600;margin:0 8px">Dashboard</a>
                    <span style="color:#D5D2C9">•</span>
                    <a href="mailto:namaste@mindmirageindia.com" style="color:#C0531F;text-decoration:none;font-weight:600;margin:0 8px">Support</a>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM ?? "Mind Mirage <onboarding@resend.dev>",
        to: [to],
        subject,
        html: emailHtml,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* Best-effort WhatsApp via Meta Cloud API */
export async function sendWhatsApp(
  to: string,
  message: string,
): Promise<boolean> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !to) return false;

  const clean = to.replace(/[^0-9]/g, "");
  if (clean.length < 10) return false;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: clean,
          type: "text",
          text: { body: message },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
