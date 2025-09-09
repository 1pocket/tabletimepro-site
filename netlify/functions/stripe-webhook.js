// netlify/functions/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        "unknown@example.com";

      // Optionally expand to get price IDs
      let priceIds = [];
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price"],
        });
        priceIds = (full.line_items?.data || [])
          .map((li) => li.price?.id)
          .filter(Boolean);
      } catch (e) {
        console.warn("Could not expand line items:", e.message);
      }

      // ✅ Use Netlify Function runtime Blobs stores
      const tenants = context?.blobs?.store("ttpro_customers");
      const configs = context?.blobs?.store("ttpro_configs");
      const maps    = context?.blobs?.store("ttpro_maps");

      if (!tenants || !configs || !maps) {
        console.error("Blobs not available in function context");
        return { statusCode: 500, body: "Blobs not available" };
      }

      // 1) Ensure tenant record
      const tenantKey = `tenants/${session.customer}.json`;
      let tenant = await tenants.getJSON(tenantKey);
      if (!tenant) {
        tenant = {
          customerId: session.customer,             // cus_...
          email,
          subscriptionId: session.subscription,     // sub_...
          priceIds,
          status: "active",
          secret: crypto.randomBytes(24).toString("hex"),
          createdAt: new Date().toISOString(),
        };
        await tenants.setJSON(tenantKey, tenant);
      }

      // 2) Seed default config if none
      const cfgKey = `configs/${session.customer}.json`;
      const existing = await configs.getJSON(cfgKey);
      if (!existing) {
        const defaultConfig = {
          tables: ["Table 1", "Table 2", "Table 3", "Table 4"],
          staff: [],
          settings: { taxRate: 0, rounding: "none" },
        };
        await configs.setJSON(cfgKey, defaultConfig);
      }

      // 3) Map session_id -> customer so success.html can fetch write key
      await maps.setJSON(
        `sessions/${session.id}.json`,
        { customerId: session.customer },
        { ttl: 60 * 60 * 24 } // 24h
      );

      console.log("✅ Provisioned tenant", {
        customer: session.customer,
        email,
        priceIds,
      });
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      const sub = stripeEvent.data.object;
      console.log("ℹ️ Subscription canceled:", sub.id, "customer:", sub.customer);
      // Optionally: mark tenant inactive here
    }

    if (stripeEvent.type === "customer.subscription.updated") {
      const sub = stripeEvent.data.object;
      console.log("ℹ️ Subscription updated:", sub.id, "status:", sub.status);
      // Optionally: update tenant’s plan/status here
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "handler error" };
  }
};
