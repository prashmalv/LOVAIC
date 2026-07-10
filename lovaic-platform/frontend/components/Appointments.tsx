"use client";
import { useEffect, useState } from "react";

interface Appt {
  id: string;
  dept: string;
  name: string;
  slot: string;
  token: number;
  created: string;
}

const DEPTS = ["Govt Hospital — OPD", "Police Station — Records", "Municipal Corp — Grievance", "RTO — Licensing"];
const SLOTS = ["09:30", "10:15", "11:00", "12:30", "15:00", "16:15"];
const KEY = "lovaic.appts";

export default function Appointments() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [dept, setDept] = useState(DEPTS[0]);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState(SLOTS[0]);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setAppts(JSON.parse(raw));
  }, []);

  const save = (list: Appt[]) => {
    setAppts(list);
    localStorage.setItem(KEY, JSON.stringify(list));
  };

  const book = () => {
    if (!name.trim()) return;
    const a: Appt = {
      id: Math.random().toString(36).slice(2, 8),
      dept,
      name: name.trim(),
      slot,
      token: 100 + appts.length + 1,
      created: new Date().toLocaleString(),
    };
    save([a, ...appts]);
    setName("");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <div className="font-semibold mb-4">Book an appointment</div>
        <div className="flex flex-col gap-3">
          <Field label="Department">
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="lv-input">
              {DEPTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Citizen name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="lv-input" />
          </Field>
          <Field label="Time slot">
            <select value={slot} onChange={(e) => setSlot(e.target.value)} className="lv-input">
              {SLOTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <button className="btn btn-primary" onClick={book}>
            Confirm & generate token
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-4">Recorded appointments ({appts.length})</div>
        {appts.length === 0 ? (
          <div className="text-sm" style={{ color: "var(--text-faint)" }}>
            No bookings yet — confirm one to see it recorded in the system.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {appts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                <div>
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                    {a.dept} · {a.slot}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                    Token
                  </div>
                  <div className="font-extrabold" style={{ color: "var(--teal)" }}>
                    #{a.token}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.lv-input) {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
