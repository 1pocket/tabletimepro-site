// /.netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (!process.env.STRIPE_PRICE_ID) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_PRICE_ID env var' }) };
    }

    const successUrl = body.success_url || process.env.SUCCESS_URL || (event.headers.origin ? `${event.headers.origin}/success.html` : 'https://tabletimepro.com/success.html');
    const cancelUrl = body.cancel_url || process.env.CANCEL_URL || (event.headers.origin ? `${event.headers.origin}/cancel.html` : 'https://tabletimepro.com/cancel.html');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl
    });

    return { statusCode: 200, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
