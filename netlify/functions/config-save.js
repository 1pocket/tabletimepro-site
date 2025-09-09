// netlify/functions/config-save.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const tenant = event.headers["x-tenant"];
  const key = event.headers["x-tenant-key"];

  if (!tenant || !key) return { statusCode: 400, body: "missing headers" };
  if (tenant === "demo") return { statusCode: 403, body: "demo read-only" };

  const tenants = getStore("ttpro_customers");
  const t = await tenants.get(`tenants/${tenant}.json`, { type: "json" });

  if (!t || t.secret !== key) return { statusCode: 403, body: "forbidden" };

  const store = getStore("ttpro_configs");
  const body = JSON.parse(event.body || "{}");
  await store.set(`configs/${tenant}.json`, JSON.stringify(body, null, 2), {
    contentType: "application/json",
  });

  return { statusCode: 200, body: "ok" };
};
