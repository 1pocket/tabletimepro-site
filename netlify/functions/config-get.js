// netlify/functions/config-get.js
const { getStore } = require("@netlify/blobs");
function useStore(name, context){ try{ return getStore({name,context}); } catch{ return getStore({ name, siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_API_TOKEN }); } }
function cors(){ return { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type, Authorization", "Access-Control-Allow-Methods":"GET,POST,OPTIONS", "Content-Type":"application/json" }; }

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };

  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}${event.rawQueryString ? "?" + event.rawQueryString : ""}`);
  const tenant = url.searchParams.get("tenant");
  const key = url.searchParams.get("key") ||
             (event.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!tenant || !key) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "tenant and key required" }) };
  }

  const tenants = useStore("ttpro_customers", context);
  const configs = useStore("ttpro_configs", context);

  const meta = await tenants.getJSON(`tenants/${tenant}.json`);
  if (!meta || meta.secret !== key) {
    return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: "unauthorized" }) };
  }

  const cfg = await configs.getJSON(`configs/${tenant}.json`);
  return { statusCode: 200, headers: cors(), body: JSON.stringify(cfg || {}) };
};
