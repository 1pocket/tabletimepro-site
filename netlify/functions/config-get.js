// netlify/functions/config-get.js
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const qp = event.queryStringParameters || {};

  // Demo short-circuit
  if (qp.demo === "1") {
    const demo = {
      demo: true,
      tables: ["Demo 1", "Demo 2", "Demo 3"],
      staff: [{ name: "Alex (demo)" }],
      settings: { taxRate: 0, rounding: "none" },
    };
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify(demo) };
  }

  const tenant = qp.tenant;
  if (!tenant) return { statusCode: 400, body: "missing tenant" };

  const store = getStore("ttpro_configs");
  const cfg = await store.get(`configs/${tenant}.json`, { type: "json" });

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(cfg || { tables: [], staff: [], settings: {} }),
  };
};
