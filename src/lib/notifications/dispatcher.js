/**
 * Multi-Channel Notification Dispatcher (WhatsApp Cloud API, Email, SMS).
 * External integration failures never break core dairy transactions.
 * Does not invent credentials or fake successful external dispatches.
 */

export function formatCollectionReceiptMessage({ farmerName, date, milkType, quantityLitres, fatPercent, amount, dairyName }) {
  return (
    `Dear ${farmerName} Ji,\n\n` +
    `Your milk collection has been recorded.\n` +
    `Date: ${date}\n` +
    `Milk Type: ${milkType}\n` +
    `Quantity: ${quantityLitres} Litres\n` +
    (fatPercent != null ? `Fat: ${fatPercent}%\n` : '') +
    `Amount: ₹${Number(amount).toFixed(2)}\n\n` +
    `Thank you,\n${dairyName}`
  );
}

export async function dispatchWhatsAppMessage({ toPhone, text }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return {
      status: 'SKIPPED_NOT_CONFIGURED',
      provider: 'whatsapp_cloud_api',
      reason: 'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set in environment.',
    };
  }

  try {
    const cleanPhone = String(toPhone).replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        status: 'FAILED',
        provider: 'whatsapp_cloud_api',
        error: data?.error?.message || 'WhatsApp API rejected message',
      };
    }

    return {
      status: 'SENT',
      provider: 'whatsapp_cloud_api',
      messageId: data?.messages?.[0]?.id || null,
    };
  } catch (err) {
    return {
      status: 'ERROR',
      provider: 'whatsapp_cloud_api',
      error: err.message,
    };
  }
}

