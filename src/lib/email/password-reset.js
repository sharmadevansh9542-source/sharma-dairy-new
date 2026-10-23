export async function sendPasswordResetOtp({ to, otp }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Password-reset email is not configured.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to,
      subject: 'Your Sharma Dairy password reset code',
      text: `Your Sharma Dairy password reset code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
    }),
  });
  if (!response.ok) throw new Error('Email provider rejected the reset message.');
}
