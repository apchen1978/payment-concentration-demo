/**
 * app.js — Shadow-002 minimum UI wiring.
 * Renders the editable payment-event table from the default fixture and
 * recalculates the rolling 7-day peak on every edit.
 * No persistence, no external calls, no charts.
 */
(function () {
  "use strict";

  const events = Shadow002Fixtures.DEFAULT_EVENTS.map((e) => ({ ...e }));
  const tbody = document.getElementById("events-body");
  const resultsEl = document.getElementById("results");

  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  function formatMoney(v) {
    return fmt.format(Math.round(v * 100) / 100);
  }

  function formatWindow(startISO, endISO) {
    if (!startISO || !endISO) return "—";
    const s = new Date(startISO + "T00:00:00Z");
    const e = new Date(endISO + "T00:00:00Z");
    const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const f = (d) => `${mo[d.getUTCMonth()]} ${d.getUTCDate()}`;
    return `${f(s)} – ${f(e)}`;
  }

  function renderTable() {
    tbody.innerHTML = "";
    events.forEach((ev, idx) => {
      const tr = document.createElement("tr");
      const tdDeal = document.createElement("td");
      tdDeal.className = "deal-label";
      tdDeal.textContent = ev.deal;
      tr.appendChild(tdDeal);

      const tdDate = document.createElement("td");
      const dateInput = document.createElement("input");
      dateInput.type = "date";
      dateInput.value = ev.date;
      dateInput.setAttribute("aria-label", `${ev.deal} date`);
      dateInput.addEventListener("input", () => {
        events[idx].date = dateInput.value;
        renderResults();
      });
      tdDate.appendChild(dateInput);
      tr.appendChild(tdDate);

      const tdAmount = document.createElement("td");
      const amountInput = document.createElement("input");
      amountInput.type = "number";
      amountInput.min = "0";
      amountInput.step = "0.01";
      amountInput.value = String(ev.amount);
      amountInput.setAttribute("aria-label", `${ev.deal} amount`);
      amountInput.addEventListener("input", () => {
        events[idx].amount = Number(amountInput.value);
        renderResults();
      });
      tdAmount.appendChild(amountInput);
      tr.appendChild(tdAmount);

      const tdCurrency = document.createElement("td");
      const currencyInput = document.createElement("input");
      currencyInput.type = "text";
      currencyInput.maxLength = 8;
      currencyInput.value = ev.currency;
      currencyInput.setAttribute("aria-label", `${ev.deal} currency`);
      currencyInput.addEventListener("input", () => {
        events[idx].currency = currencyInput.value.trim().toUpperCase() || "USD";
        renderResults();
      });
      tdCurrency.appendChild(currencyInput);
      tr.appendChild(tdCurrency);

      tbody.appendChild(tr);
    });
  }

  function renderResults() {
    const results = PeakCalc.computePeak(events);
    const currencies = Object.keys(results).sort();
    resultsEl.innerHTML = "";

    if (!currencies.length) {
      resultsEl.textContent = "No valid events to calculate.";
      return;
    }

    for (const currency of currencies) {
      const r = results[currency];
      const block = document.createElement("div");
      block.className = "currency-block";

      const h3 = document.createElement("h3");
      h3.textContent = currency;
      block.appendChild(h3);

      const rows = [
        ["Existing commitments before Deal C", formatMoney(r.beforeDealC.total), ""],
        ["Deal C incremental commitment in peak", formatMoney(r.dealCIncrementInPeak), "highlight"],
        ["Total commitments after Deal C", formatMoney(r.afterDealC.total), "highlight"],
      ];
      for (const [label, value, cls] of rows) {
        const row = document.createElement("div");
        row.className = "result-row";
        const l = document.createElement("span");
        l.className = "label";
        l.textContent = label;
        const v = document.createElement("span");
        v.className = "value" + (cls ? " " + cls : "");
        v.textContent = `${currency} ${value}`;
        row.appendChild(l);
        row.appendChild(v);
        block.appendChild(row);
      }

      const windowNote = document.createElement("p");
      windowNote.className = "window-note";
      windowNote.textContent =
        `Peak 7-day window: ${formatWindow(r.afterDealC.window.start, r.afterDealC.window.end)}` +
        `  ·  Before Deal C window: ${formatWindow(r.beforeDealC.window.start, r.beforeDealC.window.end)}`;
      block.appendChild(windowNote);

      if (r.contributors.length) {
        const ul = document.createElement("ul");
        ul.className = "contributors";
        const heading = document.createElement("div");
        heading.textContent = "Contributing orders/events:";
        block.appendChild(heading);
        for (const c of r.contributors.sort((a, b) => a.deal.localeCompare(b.deal))) {
          const li = document.createElement("li");
          li.textContent = `${c.deal}: ${currency} ${formatMoney(c.total)}`;
          ul.appendChild(li);
        }
        block.appendChild(ul);
      }

      resultsEl.appendChild(block);
    }
  }

  renderTable();
  renderResults();
})();
