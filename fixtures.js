/**
 * fixtures.js — Shadow-002 default fixture (synthetic data only).
 *
 * Exactly Deal A / Deal B / Deal C. Deal C is the proposed new deal.
 * EXACT canonical six-event fixture from Luna's Contract (owner-confirmed):
 *
 *   Deal A | USD | Deposit | Sep 01 | 20,000
 *   Deal A | USD | Balance | Oct 12 | 45,000
 *   Deal B | USD | Deposit | Sep 18 | 15,000
 *   Deal B | USD | Balance | Oct 15 | 38,000
 *   Deal C | USD | Deposit | Sep 25 | 18,000
 *   Deal C | USD | Balance | Oct 17 | 52,000
 *
 * Required deterministic rolling 7-day peak results:
 *   Before Deal C  -> USD 83,000   (peak window Oct 12–18)
 *   Deal C incremental in peak -> USD 52,000
 *   After Deal C   -> USD 135,000  (peak window Oct 12–18)
 *   Contributors   -> Deal A 45,000 / Deal B 38,000 / Deal C 52,000
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Shadow002Fixtures = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEFAULT_EVENTS = [
    // Deal A (existing commitments)
    { deal: "Deal A", type: "Deposit", date: "2026-09-01", amount: 20000, currency: "USD" },
    { deal: "Deal A", type: "Balance", date: "2026-10-12", amount: 45000, currency: "USD" },
    // Deal B (existing commitments)
    { deal: "Deal B", type: "Deposit", date: "2026-09-18", amount: 15000, currency: "USD" },
    { deal: "Deal B", type: "Balance", date: "2026-10-15", amount: 38000, currency: "USD" },
    // Deal C (proposed new deal)
    { deal: "Deal C", type: "Deposit", date: "2026-09-25", amount: 18000, currency: "USD" },
    { deal: "Deal C", type: "Balance", date: "2026-10-17", amount: 52000, currency: "USD" },
  ];

  return { DEFAULT_EVENTS };
});
