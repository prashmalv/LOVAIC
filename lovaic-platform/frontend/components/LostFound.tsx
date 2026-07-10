"use client";
import { useEffect, useRef, useState } from "react";
import {
  listLostFound,
  LostFoundItem,
  reportLostFound,
  searchLostFound,
} from "@/lib/api";

const TEAL = "#23d0c5";
const CATEGORIES = ["Bag / Luggage", "Electronics", "Documents", "Wallet / Purse", "Jewellery", "Person", "Other"];

type Tab = "report" | "search";

export default function LostFound() {
  const [tab, setTab] = useState<Tab>("report");
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [err, setErr] = useState(false);

  const refresh = () =>
    listLostFound()
      .then(setItems)
      .catch(() => setErr(true));

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {(["report", "search"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pill"
            style={{
              cursor: "pointer",
              padding: "0.5rem 1rem",
              color: tab === t ? "#fff" : "var(--text-dim)",
              background: tab === t ? TEAL : "transparent",
              borderColor: tab === t ? TEAL : "var(--border)",
            }}
          >
            {t === "report" ? "📝 Report lost / found" : "🔎 Search by photo"}
          </button>
        ))}
      </div>

      {err && (
        <div className="text-sm p-3 rounded-xl" style={{ background: "#ff5c7218", color: "var(--red)" }}>
          Backend unreachable — start the CV service on port 8000.
        </div>
      )}

      {tab === "report" ? (
        <ReportForm onReported={refresh} />
      ) : (
        <SearchByPhoto />
      )}

      <Gallery items={items} />
    </div>
  );
}

function ReportForm({ onReported }: { onReported: () => void }) {
  const [kind, setKind] = useState<"lost" | "found">("found");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<LostFoundItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    setMatches(null);
    try {
      const res = await reportLostFound({
        file,
        kind,
        title: title.trim(),
        description,
        category,
        location,
        contact,
      });
      setMatches(res.matches);
      onReported();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <div className="flex gap-2 mb-4">
          {(["found", "lost"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="pill"
              style={{
                cursor: "pointer",
                padding: "0.4rem 0.9rem",
                color: kind === k ? "#fff" : "var(--text-dim)",
                background: kind === k ? (k === "found" ? "var(--green)" : "var(--amber)") : "transparent",
                borderColor: kind === k ? (k === "found" ? "var(--green)" : "var(--amber)") : "var(--border)",
              }}
            >
              {k === "found" ? "I FOUND something" : "I LOST something"}
            </button>
          ))}
        </div>

        <div
          className="dropzone flex items-center justify-center p-4 mb-3"
          style={{ minHeight: 160 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="item" style={{ maxHeight: 150, borderRadius: 10 }} />
          ) : (
            <div className="text-center" style={{ color: "var(--text-dim)" }}>
              <div className="text-3xl mb-1">📷</div>
              <div className="text-sm">Add a clear photo of the item</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        <div className="flex flex-col gap-3">
          <input className="lf-input" placeholder="Title (e.g. Black leather backpack)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="lf-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input className="lf-input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <input className="lf-input" placeholder="Contact (phone / email)" value={contact} onChange={(e) => setContact(e.target.value)} />
          <textarea className="lf-input" placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="btn btn-primary" style={{ background: `linear-gradient(120deg, ${TEAL}, var(--brand))` }} onClick={submit} disabled={busy}>
            {busy ? "Matching…" : "Submit & auto-match"}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">AI match results</div>
        {!matches && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            When you submit, LOVAIC compares the photo against every {kind === "found" ? "lost" : "found"} report
            using visual similarity and surfaces likely matches so owners can be notified.
          </div>
        )}
        {matches && matches.length === 0 && (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>
            No visual matches yet. Your report is saved — we&apos;ll keep matching new reports against it.
          </div>
        )}
        {matches && matches.length > 0 && (
          <div className="flex flex-col gap-3">
            {matches.map((m) => (
              <MatchRow key={m.id} item={m} />
            ))}
          </div>
        )}
      </div>

      <LfStyles />
    </div>
  );
}

function SearchByPhoto() {
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<LostFoundItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (f?: File | null) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setBusy(true);
    setResults(null);
    try {
      setResults(await searchLostFound(f));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <div className="font-semibold mb-3">Search the registry by photo</div>
        <div
          className="dropzone flex items-center justify-center p-6"
          style={{ minHeight: 200 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            run(e.dataTransfer.files?.[0]);
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="query" style={{ maxHeight: 180, borderRadius: 10 }} />
          ) : (
            <div className="text-center" style={{ color: "var(--text-dim)" }}>
              <div className="text-4xl mb-2">🔎</div>
              <div className="text-sm">Upload a photo of the item / person to find</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => run(e.target.files?.[0])} />
        </div>
      </div>
      <div className="card p-5">
        <div className="font-semibold mb-3">Closest matches</div>
        {busy && <div className="skeleton" style={{ height: 80 }} />}
        {!busy && results && results.length === 0 && (
          <div className="text-sm" style={{ color: "var(--text-dim)" }}>No items in the registry match yet.</div>
        )}
        {!busy && results && (
          <div className="flex flex-col gap-3">
            {results.map((m) => (
              <MatchRow key={m.id} item={m} />
            ))}
          </div>
        )}
        {!results && !busy && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            Ranked by visual similarity against all lost & found reports.
          </div>
        )}
      </div>
      <LfStyles />
    </div>
  );
}

function MatchRow({ item }: { item: LostFoundItem }) {
  const score = Math.round((item.match_score ?? 0) * 100);
  return (
    <div className="flex gap-3 p-3 rounded-xl items-center" style={{ background: "var(--surface-2)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt={item.title} style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{item.title}</div>
        <div className="text-xs" style={{ color: "var(--text-dim)" }}>
          {item.kind.toUpperCase()} · {item.category} · {item.location || "—"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs" style={{ color: "var(--text-faint)" }}>match</div>
        <div className="font-extrabold" style={{ color: score > 70 ? "var(--green)" : score > 45 ? "var(--amber)" : "var(--text-dim)" }}>
          {score}%
        </div>
      </div>
    </div>
  );
}

function Gallery({ items }: { items: LostFoundItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="font-semibold mb-3">Public registry ({items.length})</div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((it) => (
          <div key={it.id} className="card card-hover p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt={it.title} style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10 }} />
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold truncate">{it.title}</span>
              <span
                className="pill"
                style={{
                  color: it.kind === "found" ? "var(--green)" : "var(--amber)",
                  borderColor: it.kind === "found" ? "var(--green)" : "var(--amber)",
                }}
              >
                {it.kind}
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              {it.category} · {it.location || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LfStyles() {
  return (
    <style jsx global>{`
      .lf-input {
        width: 100%;
        padding: 0.6rem 0.8rem;
        border-radius: 12px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--text);
        outline: none;
        font-family: inherit;
      }
    `}</style>
  );
}
