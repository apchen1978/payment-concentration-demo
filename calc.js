/**
 * calc.js — Shadow-002 disposable prototype calculation.
 *
 * Deterministic rolling 7-calendar-day peak commitment calculation.
 * - Input: payment events [{ deal, date: "YYYY-MM-DD", amount, currency }]
 * - Output: per-currency results:
 *     beforeDealC  = peak 7-day total excluding Deal C events
 *     afterDealC   = peak 7-day total including all events
 *     dealCIncrementInPeak = Deal C events falling inside the peak window
 *     contributors = per-deal totals inside the peak window
 *
 * Tie-break / reporting rule: among windows with the maximum total, the
 * displayed window is anchored to an actual contributing payment-event date
 * (a window whose start day has at least one payment event); earliest such
 * start wins. Currency separation: each currency is calculated independently.
 * No persistence, no external state, no side effects.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PeakCalc = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const WINDOW_DAYS = 7;
  const DEAL_C = "Deal C";

  /**
   * Convert "YYYY-MM-DD" to a UTC day number (deterministic, TZ-independent).
   */
  function dayNumber(dateStr) {
    if (typeof dateStr !== "string") return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
  }

  /**
   * Convert a UTC day number back to "YYYY-MM-DD".
   */
  function dayToString(dayNum) {
    const dt = new Date(dayNum * 86400000);
    const p = (n) => String(n).padStart(2, "0");
    return dt.getUTCFullYear() + "-" + p(dt.getUTCMonth() + 1) + "-" + p(dt.getUTCDate());
  }

  function isFiniteNumber(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  /**
   * Deterministic peak over rolling WINDOW_DAYS calendar windows.
   * @param {Array<{day:number, amount:number}>} events
   * @returns {{start:number, end:number, total:number}}
   *
   * Reporting rule (owner-approved, Shadow-002): among all 7-calendar-day
   * windows achieving the maximum total, the displayed window is anchored to
   * an actual contributing payment-event date — i.e. prefer a window whose
   * start day has at least one payment event; earliest such start wins ties.
   * (A window like Oct 11–17 that is mathematically equivalent to Oct 12–18
   * is not shown, because Oct 11 contains no payment event.)
   */
  function peakWindow(events) {
    if (!events.length) return { start: null, end: null, total: 0 };
    const days = [...new Set(events.map((e) => e.day))].sort((a, b) => a - b);
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    // Windows can start before the first event (up to WINDOW_DAYS-1 days prior)
    const firstStart = firstDay - (WINDOW_DAYS - 1);
    const lastStart = lastDay;

    // Pass 1: maximum total over all rolling windows.
    let bestTotal = -Infinity;
    for (let start = firstStart; start <= lastStart; start++) {
      const end = start + WINDOW_DAYS - 1;
      let total = 0;
      for (const e of events) {
        if (e.day >= start && e.day <= end) total += e.amount;
      }
      if (total > bestTotal) bestTotal = total;
    }

    // Pass 2: among windows achieving bestTotal, prefer a start day that is
    // itself a payment-event date (deterministic: earliest such start wins).
    const eventDaySet = new Set(events.map((e) => e.day));
    let best = null;
    for (let start = firstStart; start <= lastStart; start++) {
      const end = start + WINDOW_DAYS - 1;
      let total = 0;
      for (const e of events) {
        if (e.day >= start && e.day <= end) total += e.amount;
      }
      if (total !== bestTotal) continue;
      const anchored = eventDaySet.has(start);
      if (
        best === null ||
        (anchored && !best.anchored) ||
        (anchored === best.anchored && start < best.start)
      ) {
        best = { start, end, total, anchored };
      }
    }
    return { start: best.start, end: best.end, total: best.total };
  }

  /**
   * Compute per-currency peak results.
   * @param {Array<{deal:string, date:string, amount:number, currency:string}>} events
   */
  function computePeak(events) {
    const normalized = [];
    for (const e of events || []) {
      const day = dayNumber(e.date);
      if (day === null) continue;
      const amount = Number(e.amount);
      if (!isFiniteNumber(amount) || amount < 0) continue;
      normalized.push({
        deal: String(e.deal),
        day,
        amount,
        currency: String(e.currency || "USD").trim().toUpperCase() || "USD",
      });
    }

    // Group by currency, calculate each separately
    const byCurrency = new Map();
    for (const e of normalized) {
      if (!byCurrency.has(e.currency)) byCurrency.set(e.currency, []);
      byCurrency.get(e.currency).push(e);
    }

    const result = {};
    for (const [currency, events] of byCurrency) {
      const after = peakWindow(events);
      const beforeEvents = events.filter((e) => e.deal !== DEAL_C);
      const before = peakWindow(beforeEvents);

      // Deal C events inside the after-peak window
      const peakEvents = events.filter((e) => e.day >= after.start && e.day <= after.end);
      const dealCInPeak = peakEvents
        .filter((e) => e.deal === DEAL_C)
        .reduce((s, e) => s + e.amount, 0);

      // Contributors inside the after-peak window
      const contributors = new Map();
      for (const e of peakEvents) {
        contributors.set(e.deal, (contributors.get(e.deal) || 0) + e.amount);
      }

      result[currency] = {
        currency,
        beforeDealC: {
          total: before.total,
          window: { start: before.start === null ? null : dayToString(before.start), end: before.end === null ? null : dayToString(before.end) },
        },
        afterDealC: {
          total: after.total,
          window: { start: dayToString(after.start), end: dayToString(after.end) },
        },
        dealCIncrementInPeak: dealCInPeak,
        contributors: [...contributors.entries()].map(([deal, total]) => ({ deal, total })),
      };
    }
    return result;
  }

  return { computePeak, dayNumber, dayToString };
});
