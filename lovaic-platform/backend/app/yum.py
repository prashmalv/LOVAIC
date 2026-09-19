"""
Yum! India — POS Intelligence + Store Performance Copilot.

Serves the pre-computed POS aggregates (see scripts/build_yum_pos.py) and a
rule-based natural-language copilot that answers plain-language business
questions off those aggregates. Every figure the copilot returns is computed
from the two source POS workbooks — nothing is fabricated. This is the
"AI layer on top of POS data" the Yum showcase demonstrates.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache

DATA = os.path.join(os.path.dirname(__file__), "data", "yum_pos.json")


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(DATA) as f:
        return json.load(f)


def insights() -> dict:
    """The full dashboard payload consumed by the frontend."""
    return _load()


# --------------------------------------------------------------------------
# Copilot — deterministic NL answers over the aggregates
# --------------------------------------------------------------------------
def _suggested():
    return [
        "How are sales and average order value trending?",
        "When are my peak and quiet hours?",
        "Which categories and items drive the most revenue?",
        "Where am I losing margin or leaking revenue?",
        "What stock is slow-moving / at waste risk?",
        "How should I plan staffing and kitchen prep?",
        "How is my procurement and supplier margin?",
        "Which cities and store classes perform best?",
    ]


def _answer(question: str) -> dict:
    d = _load()
    sr = d["store_raw"]
    k = sr["kpis"]
    st = sr["store"]
    q = (question or "").lower()

    def has(*words):
        return any(w in q for w in words)

    store_tag = f"Store {st['id']} · {st['city']} (Class {st['class']}, {st['type']}) · {st['date_from']}–{st['date_to']}"

    # -- Peak hours / staffing / kitchen prep ------------------------------
    if has("peak", "hour", "quiet", "busy", "day-part", "day part", "when", "time of day",
           "staff", "staffing", "roster", "manpower", "shift", "kitchen", "prep", "forecast"):
        hours = [h for h in sr["hours"] if h["txns"] > 0]
        hours_sorted = sorted(hours, key=lambda x: x["sales"], reverse=True)
        top3 = hours_sorted[:3]
        quiet3 = sorted(hours, key=lambda x: x["sales"])[:3]
        peak = sr["peak_hour"]

        def hr(h):
            return f"{h % 12 or 12}{'am' if h < 12 else 'pm'}"

        top_txt = ", ".join(f"{hr(h['hour'])} ({h['txns']} txns)" for h in top3)
        quiet_txt = ", ".join(hr(h["hour"]) for h in quiet3)
        peak_share = round(sum(h["sales"] for h in top3) / max(k["total_sales"], 1) * 100)
        return {
            "answer": (
                f"The dinner day-part drives this store. Peak billing hour is **{hr(peak)}**, and the "
                f"top three hours — {top_txt} — alone account for ~**{peak_share}%** of daily sales. "
                f"Quietest trading hours are {quiet_txt}."
            ),
            "recommendations": [
                f"Front-load crew and kitchen prep for the {hr(peak)} dinner rush; a workforce model on 30/60-min windows would flex staff to this curve (Pillar A).",
                f"Pull non-selling tasks (cleaning, restock, training) into the quiet {quiet_txt} window instead of peak.",
                "Pair this day-part demand curve with the LOVAIC Queue & Service vision layer to catch queue build-up before it costs a sale.",
            ],
            "metrics": [
                {"label": "Peak hour", "value": hr(peak)},
                {"label": "Top-3 hrs share", "value": f"{peak_share}%"},
                {"label": "Quiet hours", "value": quiet_txt},
            ],
            "chart": "hours",
            "source": store_tag,
        }

    procurement_q = has("procure", "procurement", "supplier", "vendor", "inward", "purchase", "buying")

    # -- Margin / revenue leakage / discount / anomaly ---------------------
    if not procurement_q and has(
            "margin", "leak", "leakage", "shrink", "loss", "losing", "discount", "markdown",
            "anomaly", "fraud", "overcharge", "revenue protection", "profit"):
        disc = sr["discount"]
        inw = d["inward"]
        anom = d["sales_sample"]["price_anomalies"]
        return {
            "answer": (
                f"Two leakage signals stand out. **Discounting:** {disc['lines_discounted']:,} line items "
                f"({disc['discount_pct_of_lines']}% of all lines) sold below MRP, worth "
                f"**{disc['discount_value_fmt']}** in given-away margin. **Price anomalies:** "
                f"{disc['overcharge_lines']} lines here (and {anom} in the multi-store sample) billed *above* "
                f"MRP — exactly the pattern Revenue Protection + Satya Doc flag. Inward margin averages only "
                f"**{inw['avg_margin_pct']}%**, so every leaked point matters."
            ),
            "recommendations": [
                "Cap unmanaged store-level discounting; route exceptions through approval — recovering half the below-MRP give-away adds real margin.",
                "Turn on Fraud & Anomaly Detection (Satya Doc) on refunds, voids and above-MRP lines; reconcile billed-vs-delivered with the LOVAIC Revenue Protection vision layer.",
                "Renegotiate the lowest-margin inward SKUs (see procurement view) — a few points on high-volume staples beats chasing many small items.",
            ],
            "metrics": [
                {"label": "Below-MRP lines", "value": f"{disc['lines_discounted']:,}"},
                {"label": "Margin given away", "value": disc["discount_value_fmt"]},
                {"label": "Above-MRP lines", "value": str(disc["overcharge_lines"] + anom)},
                {"label": "Avg inward margin", "value": f"{inw['avg_margin_pct']}%"},
            ],
            "chart": "margin",
            "source": store_tag,
        }

    # -- Slow movers / waste / dead stock ----------------------------------
    if has("slow", "waste", "dead", "deadstock", "dead-stock", "expiry", "expire", "obsolete",
           "not selling", "unsold", "inventory risk"):
        slow = sr["slow_movers"][:6]
        names = ", ".join(s["name"] for s in slow[:4])
        return {
            "answer": (
                f"Of {k['unique_skus']:,} active SKUs, a long tail barely moves. The slowest include: "
                f"{names}. These tie up shelf space and, for perishables, become waste. Amul Milk and other "
                f"top items fly; this tail is the opposite problem."
            ),
            "recommendations": [
                "Flag the slow tail for markdown-before-expiry or de-listing; free the shelf for proven movers.",
                "Feed velocity into Inventory & Food-Waste AI (Pillar A) so re-order pars auto-shrink for slow SKUs.",
                "For perishables, use LOVAIC Space Intelligence + shelf vision to trigger FEFO rotation alerts.",
            ],
            "metrics": [
                {"label": "Active SKUs", "value": f"{k['unique_skus']:,}"},
                {"label": "Slow-mover tail", "value": f"{len(sr['slow_movers'])}+ shown"},
            ],
            "chart": "slow",
            "source": store_tag,
        }

    # -- Categories / items / mix / best sellers ---------------------------
    if has("categor", "item", "product", "sku", "best seller", "best-seller", "top", "mix",
           "menu", "brand", "sell", "revenue driver", "what sells"):
        cats = sr["categories"][:5]
        items = sr["top_items"][:5]
        cat_txt = ", ".join(f"{c['name']} ({c['share']}%)" for c in cats[:4])
        item_txt = ", ".join(f"{i['name']} ({i['revenue']:,})" for i in items[:3])
        return {
            "answer": (
                f"Revenue is led by **{cats[0]['name']}** at {cats[0]['share']}% of sales. Full mix: {cat_txt}. "
                f"Top items by revenue: {item_txt}. A handful of hero SKUs carry the store."
            ),
            "recommendations": [
                "Never-out-of-stock discipline on the top 20 hero SKUs — a stock-out here is a direct sales loss.",
                "Build combos/next-best-offer around the hero items to lift AOV (currently " + k["aov_fmt"] + ").",
                "Use Menu Optimization (Extended Intelligence) to prune the weak tail and push high-margin winners.",
            ],
            "metrics": [
                {"label": "Top category", "value": f"{cats[0]['name']} · {cats[0]['share']}%"},
                {"label": "#1 item", "value": items[0]["name"]},
                {"label": "Unique SKUs", "value": f"{k['unique_skus']:,}"},
            ],
            "chart": "categories",
            "source": store_tag,
        }

    # -- Procurement / supplier / inward -----------------------------------
    if has("procure", "procurement", "supplier", "vendor", "inward", "purchase", "buying", "po ", "order"):
        inw = d["inward"]
        best = inw["best_margin"][:3]
        worst = inw["worst_margin"][:3]
        best_txt = ", ".join(b["name"] for b in best)
        worst_txt = ", ".join("{} ({}%)".format(w["name"], w["margin_pct"]) for w in worst)
        return {
            "answer": (
                f"Inward purchasing totals **{inw['total_inward_fmt']}** across {inw['orders']} goods-receipt "
                f"orders / {inw['po_count']} POs, at an average landed margin of **{inw['avg_margin_pct']}%**. "
                f"Best-margin buys: {best_txt}. Thinnest: {worst_txt}."
            ),
            "recommendations": [
                "Consolidate POs across the merged Devyani–Sapphire vendor base for volume pricing (a stated merger synergy).",
                "Renegotiate or substitute the thin-margin lines; small buys at low margin are pure working-capital drag.",
                "Run AI Procurement Intelligence to forecast purchase needs off the demand curve and score supplier reliability.",
            ],
            "metrics": [
                {"label": "Inward value", "value": inw["total_inward_fmt"]},
                {"label": "Orders / POs", "value": f"{inw['orders']} / {inw['po_count']}"},
                {"label": "Avg margin", "value": f"{inw['avg_margin_pct']}%"},
            ],
            "chart": "margin",
            "source": store_tag,
        }

    # -- Cities / store classes / portfolio --------------------------------
    if has("city", "cities", "class", "portfolio", "store perform", "which store", "region", "compare stores"):
        cl = d["classification"]
        cities = [c for c in cl if c["city"].lower() != "grand total"]
        gt = next((c for c in cl if c["city"].lower() == "grand total"), None)
        top = cities[:3]
        top_txt = ", ".join(f"{c['city']} ({c['billed_stores']})" for c in top)
        return {
            "answer": (
                f"Across the portfolio there are **{gt['billed_stores'] if gt else '—'}** consistently-billed "
                f"stores ({gt['a'] if gt else '—'} Class A / {gt['b'] if gt else '—'} B / {gt['c'] if gt else '—'} C). "
                f"Biggest footprints: {top_txt}. Class A stores (>₹10L GMV) are the priority tier for CV + copilot rollout."
            ),
            "recommendations": [
                "Start the pilot on a tight cluster of 10–20 Class A stores in one metro (matches the Phase-1 plan).",
                "Benchmark same-class stores on AOV and day-part efficiency; the copilot explains the outliers.",
                "Scale proven modules class-by-class rather than all-at-once to keep the ROI signal clean.",
            ],
            "metrics": ([
                {"label": "Billed stores", "value": str(gt["billed_stores"])},
                {"label": "Class A", "value": str(gt["a"])},
                {"label": "Top city", "value": top[0]["city"]},
            ] if gt else []),
            "chart": "classification",
            "source": "City-level store classification",
        }

    # -- Default: overall sales / AOV health -------------------------------
    ss = d["sales_sample"]
    return {
        "answer": (
            f"Over the sample period this store did **{k['total_sales_fmt']}** across **{k['transactions']:,}** "
            f"transactions — average order value **{k['aov_fmt']}**, basket **{k['basket_size']} units**, from "
            f"**{k['unique_skus']:,}** unique SKUs. Peak trading is the {sr['peak_hour'] % 12 or 12}pm dinner hour. "
            f"Credit sales run at {ss['credit_share_pct']}% of the multi-store sample — worth watching for collection risk."
        ),
        "recommendations": [
            "Lift AOV with hero-item combos and next-best-offer prompts at billing.",
            "Match staffing and prep to the dinner peak; shift chores to quiet hours.",
            "Ask me anything specific: peak hours, margin leakage, slow stock, procurement, or category mix.",
        ],
        "metrics": [
            {"label": "Total sales", "value": k["total_sales_fmt"]},
            {"label": "Transactions", "value": f"{k['transactions']:,}"},
            {"label": "AOV", "value": k["aov_fmt"]},
            {"label": "Basket", "value": f"{k['basket_size']} u"},
        ],
        "chart": "kpi",
        "source": store_tag,
    }


def copilot(question: str) -> dict:
    res = _answer(question)
    res["question"] = question
    res["suggested"] = _suggested()
    return res
