// netlify/functions/provision-info.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const sessionId =
    event.queryStringParameters?.session_id ||
    event.queryStringParameters?.sessionId;

  if (!sessionId) return { statusCode: 400, body: "missing session_id" };

  const maps = getStore("ttpro_maps");
  const tenants = getStore("ttpro_customers");

  const map = await maps.get(`sessions/${sessionId}.json`, { type: "json" });
  if (!map?.customerId) return { statusCode: 404, body: "not found" };

  const tenant = await tenants.get(`tenants/${map.customerId}.json`, {
    type: "json",
  });
  if (!tenant) return { statusCode: 404, body: "tenant not found" };

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenant: tenant.customerId, key: tenant.secret }),
  };
};
