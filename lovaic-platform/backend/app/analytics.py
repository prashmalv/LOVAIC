"""
Simulated analytics for the dashboard-heavy modules.

These endpoints return realistic, deterministic time-series + KPIs so the
demo dashboards look alive without needing a live sensor network. Seeded per
module so numbers are stable across refreshes but distinct per module.
"""
from __future__ import annotations

import hashlib
import math


def _rng(seed_key: str):
    """Tiny deterministic PRNG (LCG) seeded from a string key."""
    seed = int(hashlib.sha256(seed_key.encode()).hexdigest(), 16) % (2**32)
    state = {"s": seed}

    def rnd() -> float:
        state["s"] = (1103515245 * state["s"] + 12345) & 0x7FFFFFFF
        return state["s"] / 0x7FFFFFFF

    return rnd


HOURS = [f"{h:02d}:00" for h in range(24)]


def _daily_curve(base: float, peak_hours: list[int], amp: float, rnd) -> list[float]:
    out = []
    for h in range(24):
        peak = max(math.exp(-((h - ph) ** 2) / 6) for ph in peak_hours)
        val = base + amp * peak + (rnd() - 0.5) * amp * 0.25
        out.append(round(max(val, 0), 1))
    return out


def module_summary(module: str) -> dict:
    rnd = _rng(module)

    if module == "waste":
        series = _daily_curve(6, [9, 18], 22, rnd)
        return {
            "kpis": [
                {"label": "Litter incidents (24h)", "value": 148, "delta": -12, "unit": ""},
                {"label": "Plastic flagged", "value": "63%", "delta": 4, "unit": ""},
                {"label": "Hotspots active", "value": 9, "delta": -2, "unit": ""},
                {"label": "Avg. cleanup time", "value": 42, "delta": -7, "unit": "min"},
            ],
            "series": {"name": "Litter reports", "hours": HOURS, "values": series},
            "breakdown": [
                {"name": "Plastic bottles", "value": 41},
                {"name": "Wrappers / bags", "value": 27},
                {"name": "Cups / containers", "value": 18},
                {"name": "Mixed / organic", "value": 14},
            ],
            "hotspots": [
                {"zone": "Riverfront Ghat 3", "score": 92, "trend": "up"},
                {"zone": "Market Rd junction", "score": 81, "trend": "flat"},
                {"zone": "Bus Depot lane", "score": 74, "trend": "down"},
                {"zone": "Lake north bank", "score": 69, "trend": "up"},
            ],
        }

    if module == "traffic":
        series = _daily_curve(20, [9, 19], 70, rnd)
        return {
            "kpis": [
                {"label": "Vehicles / hr (peak)", "value": 3120, "delta": 8, "unit": ""},
                {"label": "Avg. junction wait", "value": 47, "delta": -5, "unit": "s"},
                {"label": "Congested junctions", "value": 4, "delta": 1, "unit": ""},
                {"label": "Signal auto-tuned", "value": 26, "delta": 3, "unit": ""},
            ],
            "series": {"name": "Vehicle flow", "hours": HOURS, "values": series},
            "breakdown": [
                {"name": "Cars", "value": 52},
                {"name": "Two-wheelers", "value": 28},
                {"name": "Buses/Trucks", "value": 13},
                {"name": "Autos", "value": 7},
            ],
            "hotspots": [
                {"zone": "Ring Rd × MG Rd", "score": 88, "trend": "up"},
                {"zone": "Station flyover", "score": 79, "trend": "flat"},
                {"zone": "Tech Park gate", "score": 71, "trend": "up"},
            ],
        }

    if module == "queue":
        series = _daily_curve(3, [11, 15], 14, rnd)
        return {
            "kpis": [
                {"label": "Citizens served (24h)", "value": 2140, "delta": 6, "unit": ""},
                {"label": "Avg. wait time", "value": 18, "delta": -9, "unit": "min"},
                {"label": "Counters open", "value": 7, "delta": 1, "unit": ""},
                {"label": "Appointments booked", "value": 384, "delta": 22, "unit": ""},
            ],
            "series": {"name": "Queue length", "hours": HOURS, "values": series},
            "breakdown": [
                {"name": "Municipal Corp", "value": 38},
                {"name": "Govt Hospital", "value": 31},
                {"name": "Police Station", "value": 18},
                {"name": "RTO", "value": 13},
            ],
            "hotspots": [
                {"zone": "Hospital OPD desk", "score": 90, "trend": "up"},
                {"zone": "Municipal window 2", "score": 76, "trend": "flat"},
            ],
        }

    if module == "safety":
        series = _daily_curve(30, [20, 22], 120, rnd)
        return {
            "kpis": [
                {"label": "Feeds monitored", "value": 214, "delta": 12, "unit": ""},
                {"label": "Alerts (24h)", "value": 37, "delta": -4, "unit": ""},
                {"label": "Avg. response", "value": 3.4, "delta": -0.6, "unit": "min"},
                {"label": "Crowd zones", "value": 5, "delta": 1, "unit": ""},
            ],
            "series": {"name": "Crowd density index", "hours": HOURS, "values": series},
            "breakdown": [
                {"name": "Crowd density", "value": 34},
                {"name": "Loitering", "value": 22},
                {"name": "Abandoned object", "value": 15},
                {"name": "Perimeter breach", "value": 29},
            ],
            "hotspots": [
                {"zone": "Central Market", "score": 85, "trend": "up"},
                {"zone": "Railway concourse", "score": 80, "trend": "flat"},
                {"zone": "Stadium gate B", "score": 73, "trend": "up"},
            ],
        }

    if module == "retail":
        series = _daily_curve(8, [13, 19], 40, rnd)
        return {
            "kpis": [
                {"label": "Footfall (24h)", "value": 1860, "delta": 9, "unit": ""},
                {"label": "Avg. dwell time", "value": 14.2, "delta": 2, "unit": "min"},
                {"label": "Conversion", "value": "31%", "delta": 3, "unit": ""},
                {"label": "Staff attentiveness", "value": "78%", "delta": -2, "unit": ""},
            ],
            "series": {"name": "Store footfall", "hours": HOURS, "values": series},
            "breakdown": [
                {"name": "Grocery", "value": 34},
                {"name": "Apparel", "value": 26},
                {"name": "Electronics", "value": 21},
                {"name": "Checkout", "value": 19},
            ],
            "hotspots": [
                {"zone": "Aisle 4 (Snacks)", "score": 88, "trend": "up"},
                {"zone": "Entrance display", "score": 82, "trend": "flat"},
                {"zone": "Billing counter", "score": 70, "trend": "up"},
            ],
        }

    return {"kpis": [], "series": {"name": "", "hours": HOURS, "values": []},
            "breakdown": [], "hotspots": []}


# --- Domain reference data --------------------------------------------------

def shelf_alerts() -> list[dict]:
    return [
        {"sku": "AMUL-MILK-1L", "name": "Amul Gold Milk 1L", "shelf": "Dairy A2",
         "stock": 4, "status": "low", "expiry_days": 2},
        {"sku": "LAYS-CLS-52", "name": "Lays Classic 52g", "shelf": "Snacks 4",
         "stock": 0, "status": "out", "expiry_days": 45},
        {"sku": "MAGGI-2M-70", "name": "Maggi 2-Min 70g", "shelf": "Instant 3",
         "stock": 9, "status": "low", "expiry_days": 120},
        {"sku": "CURD-500", "name": "Fresh Curd 500g", "shelf": "Dairy A1",
         "stock": 12, "status": "ok", "expiry_days": 1},
        {"sku": "BREAD-BRN", "name": "Brown Bread 400g", "shelf": "Bakery 1",
         "stock": 2, "status": "low", "expiry_days": 1},
    ]


def dustbin_network() -> dict:
    bins = [
        {"id": "BIN-001", "zone": "Riverfront Ghat 3", "fill": 96, "status": "overflow", "lat": 23.176, "lng": 75.788},
        {"id": "BIN-014", "zone": "Market Rd junction", "fill": 88, "status": "overflow", "lat": 23.182, "lng": 75.779},
        {"id": "BIN-022", "zone": "Bus Depot lane", "fill": 61, "status": "filling", "lat": 23.169, "lng": 75.795},
        {"id": "BIN-030", "zone": "School Rd", "fill": 34, "status": "ok", "lat": 23.190, "lng": 75.771},
        {"id": "BIN-041", "zone": "Lake north bank", "fill": 79, "status": "filling", "lat": 23.201, "lng": 75.766},
    ]
    suggestions = [
        {"zone": "Riverfront Ghat 3", "reason": "Recurring overflow + high litter score", "action": "Add 2 segregated bins + daily pickup"},
        {"zone": "Tech Park gate", "reason": "High footfall, no bin within 200m", "action": "Install 1 new smart bin"},
        {"zone": "Lake north bank", "reason": "Rising fill trend near water body", "action": "Upgrade to covered bin + weekly audit"},
    ]
    return {"bins": bins, "suggestions": suggestions}


def schemes(state: str = "Madhya Pradesh", category: str = "all") -> list[dict]:
    data = [
        {"name": "Ladli Behna Yojana", "category": "economic", "state": "Madhya Pradesh",
         "benefit": "₹1,250/month to eligible women", "eligibility": "Women 21–60, family income < ₹2.5L",
         "dept": "Women & Child Development"},
        {"name": "Mukhyamantri Annadoot Yojana", "category": "food", "state": "Madhya Pradesh",
         "benefit": "Subsidised foodgrain transport & PDS access", "eligibility": "BPL / priority households",
         "dept": "Food & Civil Supplies"},
        {"name": "MP Startup Policy Grant", "category": "business", "state": "Madhya Pradesh",
         "benefit": "Up to ₹18L funding + lease-rent subsidy", "eligibility": "DPIIT-registered startups < 7 yrs",
         "dept": "MSME"},
        {"name": "PM Vishwakarma", "category": "business", "state": "All India",
         "benefit": "₹15k toolkit + ₹1L–₹2L collateral-free loan", "eligibility": "Traditional artisans & craftspeople",
         "dept": "MSME (Central)"},
        {"name": "Sambal 2.0", "category": "economic", "state": "Madhya Pradesh",
         "benefit": "Maternity, education & accident assistance", "eligibility": "Unorganised-sector workers",
         "dept": "Labour"},
        {"name": "PM-POSHAN", "category": "food", "state": "All India",
         "benefit": "Free mid-day meals for schoolchildren", "eligibility": "Govt & aided school students",
         "dept": "Education (Central)"},
    ]
    out = [s for s in data if s["state"] in (state, "All India")]
    if category != "all":
        out = [s for s in out if s["category"] == category]
    return out
