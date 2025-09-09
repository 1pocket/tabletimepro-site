// netlify/functions/config-save.js
const { getStore } = require("@netlify/blobs");
function useStore(name, context){ try{ return getStore({name,context}); } catch{ return getStore({ name, siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_API_TOKEN }); } }
function cors(){ return { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"Content-Type, Authorization", "Access-Control-Allow-Methods":"GET,POST,OPTIONS", "Content-Type":"application/json" }; }

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors() };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors(), body: "Method Not Allowed" };

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "invalid JSON" }) }; }

  const { tenant, key, config } = body;
  if (!tenant || !key || typeof config !== "object") {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: "tenant, key & config required" }) };
  }

  const tenants = useStore("ttpro_customers", context);
  const configs = useStore("ttpro_configs", context);

  const meta = await tenants.getJSON(`tenants/${tenant}.json`);
  if (!meta || meta.secret !== key) {
    return { statusCode: 401, headers: cors(), body: JSON.stringify({ error: "unauthorized" }) };
  }

  await configs.setJSON(`configs/${tenant}.json`, config);
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
};
