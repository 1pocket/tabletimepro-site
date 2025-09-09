<script>
  const TEST_LINKS = { /* your test links (already set) */ };
  const LIVE_LINKS = {
    basic_monthly: "https://buy.stripe.com/<live_basic_monthly>",
    basic_annual:  "https://buy.stripe.com/<live_basic_annual>",
    pro_monthly:   "https://buy.stripe.com/<live_pro_monthly>",
    pro_annual:    "https://buy.stripe.com/<live_pro_annual>"
  };
  window.TTPRO_LINKS = location.hostname.endsWith('.netlify.app') ? TEST_LINKS : LIVE_LINKS;
</script>
