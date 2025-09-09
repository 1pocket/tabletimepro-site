// netlify/functions/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// IMPORTANT: Do not JSON.parse(event.body) before verification.
// Netlify gives us the raw string body which Stripe needs to verify.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        console.log("✅ checkout.session.completed", {
          customer: session.customer,
          email:
            session.customer_details?.email ||
            session.customer_email ||
            "unknown",
          subscription: session.subscription,
          mode: session.mode,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_failed":
        console.log(`ℹ️ ${stripeEvent.type}`, stripeEvent.data.object.id);
        break;
      default:
        console.log(`(ignored) ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "handler error" };
  }
};
