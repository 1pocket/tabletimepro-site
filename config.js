<script>
// TEST (unchanged)
const TEST_LINKS = {
  basic_monthly: "https://buy.stripe.com/test_bJe00j87s5BFaBsfS563K00",
  basic_annual:  "https://buy.stripe.com/test_7sYaEXfzU8NR24W6hv63K01",
  pro_monthly:   "https://buy.stripe.com/test_eVqbJ1evQaVZ6lcbBP63K02",
  pro_annual:    "https://buy.stripe.com/test_aFabJ1bjEc03eRI35j63K03"
};

// LIVE (update the plan you changed)
const LIVE_LINKS = {
  basic_monthly: "https://buy.stripe.com/<live_basic_monthly>",
  basic_annual:  "https://buy.stripe.com/3cI9ATgBn3GOeDxf7Icwg01",   // ← your new link
  pro_monthly:   "https://buy.stripe.com/<live_pro_monthly>",
  pro_annual:    "https://buy.stripe.com/<live_pro_annual>"
};

// Use test on *.netlify.app, live on your real domain
window.TTPRO_LINKS = location.hostname.endsWith('.netlify.app') ? TEST_LINKS : LIVE_LINKS;
</script>
