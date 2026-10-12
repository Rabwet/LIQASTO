/**
 * LIQASTO — Firebase Cloud Functions
 * Safaricom Daraja M-Pesa STK Push, Callback Handler, Card Verification, and Admin Claims
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ── Environment Secrets Configuration ──
// Configure via: firebase functions:config:set mpesa.consumer_key="..." mpesa.consumer_secret="..." ...
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || functions.config().mpesa?.consumer_key || 'DARAJA_CONSUMER_KEY',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || functions.config().mpesa?.consumer_secret || 'DARAJA_CONSUMER_SECRET',
  shortcode: process.env.MPESA_SHORTCODE || functions.config().mpesa?.shortcode || '174379',
  passkey: process.env.MPESA_PASSKEY || functions.config().mpesa?.passkey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  callbackUrl: process.env.MPESA_CALLBACK_URL || functions.config().mpesa?.callback_url || 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/mpesaCallback',
  env: process.env.MPESA_ENV || 'sandbox'
};

const DARAJA_AUTH_URL = MPESA_CONFIG.env === 'production'
  ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
  : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

const DARAJA_STK_URL = MPESA_CONFIG.env === 'production'
  ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

/**
 * Obtain Daraja OAuth Access Token
 */
async function getMpesaAccessToken() {
  const credentials = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
  const response = await fetch(DARAJA_AUTH_URL, {
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Daraja access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Format Timestamp YYYYMMDDHHmmss
 */
function getTimestamp() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// ── 1. Initiate M-Pesa STK Push ──
exports.initiateMpesaStk = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone, amount, orderNumber } = req.body;

  if (!phone || !amount || !orderNumber) {
    res.status(400).json({ error: 'Missing required fields (phone, amount, orderNumber)' });
    return;
  }

  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(`${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');

    // Format phone: ensure 254XXXXXXXXX
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    const payload = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(Number(amount)),
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CONFIG.callbackUrl,
      AccountReference: orderNumber,
      TransactionDesc: `Liqasto Drinks Order ${orderNumber}`
    };

    const stkRes = await fetch(DARAJA_STK_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const stkData = await stkRes.json();
    console.log('STK push response:', stkData);

    res.status(200).json(stkData);
  } catch (error) {
    console.error('Error initiating M-Pesa STK:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ── 2. M-Pesa Callback Webhook ──
exports.mpesaCallback = functions.https.onRequest(async (req, res) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      res.status(400).send('Invalid callback body');
      return;
    }

    const resultCode = callbackData.ResultCode;
    const merchantRequestId = callbackData.MerchantRequestID;
    const checkoutRequestId = callbackData.CheckoutRequestID;

    if (resultCode === 0) {
      // Payment Successful
      const items = callbackData.CallbackMetadata?.Item || [];
      const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
      const amountItem = items.find(i => i.Name === 'Amount');
      const phoneItem = items.find(i => i.Name === 'PhoneNumber');

      const receiptNumber = receiptItem ? receiptItem.Value : null;
      const amount = amountItem ? amountItem.Value : null;
      const phone = phoneItem ? phoneItem.Value : null;

      console.log(`[M-PESA SUCCESS] Receipt: ${receiptNumber}, Amount: ${amount}, Phone: ${phone}`);

      // Locate and update order in Firestore
      const ordersRef = db.collection('orders');
      const querySnap = await ordersRef.where('customer.phone', '==', String(phone)).limit(1).get();

      if (!querySnap.empty) {
        const orderDoc = querySnap.docs[0];
        await orderDoc.ref.update({
          paymentStatus: 'paid',
          status: 'Confirmed',
          mpesaReceipt: receiptNumber,
          mpesaAmountPaid: amount,
          paidAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      console.warn(`[M-PESA FAILED/CANCELLED] ResultCode: ${resultCode}, Desc: ${callbackData.ResultDesc}`);
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    res.status(500).send('Error');
  }
});

// ── 3. Assign Admin Claim ──
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Only existing admins can assign admin claims, or bootstrap via secret
  if (!context.auth || !context.auth.token.admin) {
    if (data.bootstrapSecret !== (process.env.BOOTSTRAP_SECRET || 'liqasto_secret_2026')) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can grant admin roles.');
    }
  }

  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  await db.collection('users').doc(user.uid).set({ role: 'admin' }, { merge: true });

  return { message: `Successfully assigned admin claim to ${email}` };
});
