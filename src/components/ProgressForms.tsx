"use client";

import { useRef, useState } from "react";
import { addWeight, addMeasurement, addPhoto } from "@/app/actions";
import { navyBodyFatMale } from "@/lib/bf";
import { PROFILE } from "@/lib/targets";
import { localDateStr } from "@/lib/dates";

const today = () => localDateStr();

export function WeightForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        setBusy(true);
        await addWeight(fd);
        ref.current?.reset();
        setBusy(false);
      }}
      style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
    >
      <div style={{ flex: 1 }}>
        <div className="label">Morning weight (kg)</div>
        <input className="input" name="weight_kg" inputMode="decimal" placeholder="77.4" required />
      </div>
      <input type="hidden" name="measured_on" value={today()} />
      <button className="btn" disabled={busy} style={{ width: "auto", padding: "12px 20px" }}>{busy ? "…" : "Save"}</button>
    </form>
  );
}

export function MeasurementForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const [busy, setBusy] = useState(false);
  const preview =
    waist && neck ? navyBodyFatMale(Number(waist), Number(neck), PROFILE.heightCm) : null;
  return (
    <form
      ref={ref}
      action={async (fd) => {
        setBusy(true);
        await addMeasurement(fd);
        ref.current?.reset();
        setWaist("");
        setNeck("");
        setBusy(false);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div className="label">Waist (cm, navel)</div>
          <input className="input" name="waist_cm" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="80.5" required />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label">Neck (cm)</div>
          <input className="input" name="neck_cm" inputMode="decimal" value={neck} onChange={(e) => setNeck(e.target.value)} placeholder="34" required />
        </div>
      </div>
      <input type="hidden" name="measured_on" value={today()} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Navy BF%: <strong style={{ color: "var(--fg)" }}>{preview != null ? `${preview}%` : "—"}</strong>
        </span>
        <button className="btn" disabled={busy} style={{ width: "auto", padding: "10px 20px" }}>{busy ? "…" : "Save"}</button>
      </div>
    </form>
  );
}

export function PhotoForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  return (
    <form
      ref={ref}
      action={async (fd) => {
        setBusy(true);
        await addPhoto(fd);
        ref.current?.reset();
        setName("");
        setBusy(false);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <input type="hidden" name="taken_on" value={today()} />
      <label className="btn-ghost" style={{ textAlign: "center", cursor: "pointer", padding: "14px" }}>
        {name || "Choose progress photo"}
        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          required
          style={{ display: "none" }}
          onChange={(e) => setName(e.target.files?.[0]?.name ?? "")}
        />
      </label>
      <button className="btn" disabled={busy || !name}>{busy ? "Uploading…" : "Upload photo"}</button>
    </form>
  );
}
