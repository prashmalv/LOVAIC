"use client";
import { useRef, useState } from "react";
import { analyzeVLM, analyzeVLMFrame } from "@/lib/api";
import { DetectMode } from "@/lib/config";

const PROMPTS: Record<string, string> = {
  safety: "Describe the scene, estimate how crowded it is, flag any stampede / crowd-crush risk and any safety hazards.",
  garbage: "Describe any garbage, litter or plastic waste and suggest a waste-management action.",
  traffic: "Describe the traffic — vehicles, pedestrians and congestion — and note any issues.",
  queue: "Describe the queue / gathering of people and estimate the waiting situation.",
  retail: "Describe shopper activity and anything useful for store operations.",
  ppe: "Are people wearing safety helmets / PPE? Flag anyone who appears non-compliant.",
  general: "Describe this scene in detail — people, objects and anything notable.",
};

export default function SceneAI({ mode, accent = "#8b83ff" }: { mode: DetectMode; accent?: string }) {
  const [tier, setTier] = useState<"lite" | "pro">("lite");
  const [prompt, setPrompt] = useState(PROMPTS[mode] ?? PROMPTS.general);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUrl("");
  };

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = file
        ? await analyzeVLM(file, prompt, tier)
        : url.trim()
        ? await analyzeVLMFrame(url.trim(), prompt, mode, tier)
        : null;
      setResult(r ? r.text : "Upload a frame or enter a source URL first.");
    } catch {
      setResult("Could not reach LOVAIC SLM — is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(["lite", "pro"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className="pill"
              style={{
                cursor: "pointer", padding: "0.45rem 0.9rem",
                color: tier === t ? "#fff" : "var(--text-dim)",
                background: tier === t ? accent : "transparent",
                borderColor: tier === t ? accent : "var(--border)",
              }}
            >
              {t === "lite" ? "LOVAIC SLM Lite · 500M · CPU/edge" : "LOVAIC SLM Pro · 2B · GPU"}
            </button>
          ))}
        </div>

        <div
          className="dropzone flex items-center justify-center p-4 mb-3"
          style={{ minHeight: 170 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="frame" style={{ maxHeight: 160, borderRadius: 10 }} />
          ) : (
            <div className="text-center" style={{ color: "var(--text-dim)" }}>
              <div className="text-3xl mb-1">🧠</div>
              <div className="text-sm">Drop / click to upload a frame</div>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>— or grab a frame from a live source —</div>
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setFile(null); setPreview(null); }}
          placeholder="youtube.com/watch?v=… · rtsp:// · sample"
          className="w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />

        <label className="block text-xs mt-3" style={{ color: "var(--text-dim)" }}>
          Ask LOVAIC SLM
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full mt-1 px-3 py-2 rounded-lg outline-none text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </label>

        <button
          className="btn btn-primary w-full mt-3"
          style={{ background: `linear-gradient(120deg, ${accent}, var(--brand))` }}
          onClick={run}
          disabled={loading}
        >
          {loading ? "Analyzing on-device…" : "🧠 Analyze with LOVAIC SLM"}
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-dim)" }}>
            LOVAIC SLM · SOVEREIGN VISION-LANGUAGE MODEL
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {["🔒 On-prem / air-gapped", "🇮🇳 Sovereign", "🎯 Fine-tunable", tier === "lite" ? "CPU / edge" : "GPU"].map((t) => (
            <span key={t} className="pill" style={{ fontSize: 10, color: accent, borderColor: accent }}>{t}</span>
          ))}
        </div>

        {loading && (
          <div>
            <div className="skeleton mb-2" style={{ height: 16, width: "80%" }} />
            <div className="skeleton mb-2" style={{ height: 16 }} />
            <div className="skeleton" style={{ height: 16, width: "60%" }} />
            <div className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
              Running the model on your own hardware — ~10–20s on CPU (instant on GPU). No frame leaves this machine.
            </div>
          </div>
        )}

        {!loading && result && (
          <p className="text-sm fade-up" style={{ color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {result}
          </p>
        )}

        {!loading && !result && (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            LOVAIC SLM reads the frame and answers in natural language — crowd behaviour, hazards,
            PPE, litter, signage/plate text (OCR) or any question you type. Complements the YOLO
            detection engine with open-ended reasoning.
          </div>
        )}
      </div>
    </div>
  );
}
