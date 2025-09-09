// netlify/functions/provision-info.js
const { getStore } = require("@netlify/blobs");

function useStore(name, context) {
  try {
    return getStore({ name, context });
  } catch {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_API_TOKEN;
    return getStore({ name, siteID, token });
  }
}

async function readJSON(store, key) {
  try {
    const v = await store.get(key, { type: "json" });
    if (v !== undefined) return v;
  } catch (_) {}
  const raw = await store.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors() };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };
  }

  const sid = (event.queryStringParameters || {}).session_id;
  if (!sid) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "session_id required" }) };
  }

  try {
    const maps    = useStore("ttpro_maps", context);
    const tenants = useStore("ttpro_customers", context);

    const m = await readJSON(maps, `sessions/${sid}.json`);
    if (!m) {
      return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: "session not found" }) };
    }

    const t = await readJSON(tenants, `tenants/${m.customerId}.json`);
    if (!t) {
      return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: "tenant not found" }) };
    }

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ tenant: m.customerId, key: t.secret }),
    };
  } catch (err) {
    console.error("provision-info error:", err);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "server error" }) };
  }
};
