// config.js  (pure JS)
(function () {
  // --- TEST (unchanged; used on *.netlify.app) ---
  const TEST_LINKS = {
    basic_monthly: "https://buy.stripe.com/test_bJe00j87s5BFaBsfS563K00",
    basic_annual:  "https://buy.stripe.com/test_7sYaEXfzU8NR24W6hv63K01",
    pro_monthly:   "https://buy.stripe.com/test_eVqbJ1evQaVZ6lcbBP63K02",
    pro_annual:    "https://buy.stripe.com/test_aFabJ1bjEc03eRI35j63K03"
  };

  // --- LIVE (your new links) ---
  const LIVE_LINKS = {
    basic_monthly: "https://buy.stripe.com/5kQ3cvacZ6T0eDxcZAcwg03",
    basic_annual:  "https://buy.stripe.com/3cI28rcl7a5c2UPgbMcwg02",
    pro_monthly:   "https://buy.stripe.com/3cI9ATgBn3GOeDxf7Icwg01",
    pro_annual:    "https://buy.stripe.com/4gM00j2Kx7X4fHBgbMcwg00"
  };

  // Use TEST on *.netlify.app, LIVE on your real domain
  window.TTPRO_LINKS = location.hostname.endsWith('.netlify.app') ? TEST_LINKS : LIVE_LINKS;
})();
