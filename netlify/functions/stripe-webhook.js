// netlify/functions/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

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
      const session = stripeEvent.data.object; // includes session.id, customer, subscription, etc.
      const email =
        session.customer_details?.email ||
        session.customer_email ||
        "unknown@example.com";

      // Try to expand to know price/plan (optional)
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

      // Stores
      const tenants = getStore("ttpro_customers");
      const configs = getStore("ttpro_configs");
      const maps = getStore("ttpro_maps");

      // 1) Ensure tenant record
      const tenantKey = `tenants/${session.customer}.json`;
      let tenant = await tenants.get(tenantKey, { type: "json" });
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
        await tenants.set(tenantKey, JSON.stringify(tenant, null, 2), {
          contentType: "application/json",
        });
      }

      // 2) Seed default config if none
      const cfgKey = `configs/${session.customer}.json`;
      const existing = await configs.get(cfgKey);
      if (!existing) {
        const defaultConfig = {
          tables: ["Table 1", "Table 2", "Table 3", "Table 4"],
          staff: [],
          settings: { taxRate: 0, rounding: "none" },
        };
        await configs.set(cfgKey, JSON.stringify(defaultConfig, null, 2), {
          contentType: "application/json",
        });
      }

      // 3) Map session_id -> customer so success.html can fetch write key
      await maps.set(
        `sessions/${session.id}.json`,
        JSON.stringify({ customerId: session.customer }),
        { contentType: "application/json", ttl: 60 * 60 * 24 } // 24h
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
      // (optional) mark tenant inactive
    }

    if (stripeEvent.type === "customer.subscription.updated") {
      const sub = stripeEvent.data.object;
      console.log("ℹ️ Subscription updated:", sub.id, "status:", sub.status);
      // (optional) update plan/status in tenant record
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "handler error" };
  }
};
