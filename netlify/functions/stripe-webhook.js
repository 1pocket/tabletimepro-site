// netlify/functions/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

// Use Netlify context if available; otherwise fall back to portable API
function useStore(name, context) {
  try {
    return getStore({ name, context });
  } catch {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_API_TOKEN;
    return getStore({ name, siteID, token });
  }
}

// Helpers that work on all Blobs clients
async function readJSON(store, key) {
  // Try native JSON mode if supported
  try {
    const v = await store.get(key, { type: "json" });
    if (v !== undefined) return v;         // if key missing, returns null
  } catch (_) {}
  // Fallback to string + manual parse
  const raw = await store.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function writeJSON(store, key, obj, opts = {}) {
  const body = JSON.stringify(obj, null, 2);
  return store.set(key, body, { contentType: "application/json", ...opts });
}

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

      // Expand line items to capture price IDs (optional)
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
      const tenants = useStore("ttpro_customers", context);
      const configs = useStore("ttpro_configs", context);
      const maps    = useStore("ttpro_maps", context);

      // 1) Ensure tenant record
      const tenantKey = `tenants/${session.customer}.json`;
      let tenant = await readJSON(tenants, tenantKey);
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
        await writeJSON(tenants, tenantKey, tenant);
      }

      // 2) Seed default config if none
      const cfgKey = `configs/${session.customer}.json`;
      const existing = await readJSON(configs, cfgKey);
      if (!existing) {
        const defaultConfig = {
          tables: ["Table 1", "Table 2", "Table 3", "Table 4"],
          staff: [],
          settings: { taxRate: 0, rounding: "none" },
        };
        await writeJSON(configs, cfgKey, defaultConfig);
      }

      // 3) Map session_id -> customer for success page lookup (24h TTL)
      await writeJSON(
        maps,
        `sessions/${session.id}.json`,
        { customerId: session.customer },
        { ttl: 60 * 60 * 24 }
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
    }

    if (stripeEvent.type === "customer.subscription.updated") {
      const sub = stripeEvent.data.object;
      console.log("ℹ️ Subscription updated:", sub.id, "status:", sub.status);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "handler error" };
  }
};
