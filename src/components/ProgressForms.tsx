"use client";

import { useRef, useState } from "react";
import { addWeight, addMeasurement, addPhoto } from "@/app/actions";
import { useFormAction } from "@/hooks/useFormAction";
import SubmitButton from "@/components/SubmitButton";
import { navyBodyFatMale } from "@/lib/bf";
import { PROFILE } from "@/lib/targets";
import { localDateStr } from "@/lib/dates";

const today = () => localDateStr();

export function WeightForm() {
  const { formProps, busy } = useFormAction(addWeight);
  return (
    <form {...formProps} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <div style={{ flex: 1 }}>
        <div className="label">Morning weight (kg)</div>
        <input className="input" name="weight_kg" inputMode="decimal" placeholder="77.4" required />
      </div>
      <input type="hidden" name="measured_on" value={today()} />
      <SubmitButton busy={busy} style={{ width: "auto", padding: "12px 20px" }}>Save</SubmitButton>
    </form>
  );
}

export function MeasurementForm() {
  const [waist, setWaist] = useState("");
  const [neck, setNeck] = useState("");
  const { formProps, busy } = useFormAction(addMeasurement, {
    onReset: () => {
      setWaist("");
      setNeck("");
    },
  });
  const preview =
    waist && neck ? navyBodyFatMale(Number(waist), Number(neck), PROFILE.heightCm) : null;
  return (
    <form
      {...formProps}
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
        <SubmitButton busy={busy} style={{ width: "auto", padding: "10px 20px" }}>Save</SubmitButton>
      </div>
    </form>
  );
}

// Downscale + re-encode to JPEG client-side so uploads stay small/fast and
// stay under the Server Action body limit (also converts iOS HEIC -> JPEG).
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return file;
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const max = 1280;
    let { width, height } = img;
    const longest = Math.max(width, height);
    if (longest > max) {
      const s = max / longest;
      width = Math.round(width * s);
      height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    const base = file.name.replace(/\.\w+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // fall back to the original; 8mb server limit covers it
  }
}

export function PhotoForm() {
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.set("taken_on", today());
      fd.set("photo", compressed);
      await addPhoto(fd);
      setFile(null);
      if (camRef.current) camRef.current.value = "";
      if (libRef.current) libRef.current.value = "";
    } catch (e) {
      setError("Upload failed — try again.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="chip" style={{ justifyContent: "space-between", padding: "10px 12px" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {file.name}</span>
          <button type="button" className="btn-danger" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => setFile(null)}>
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" style={{ flex: 2 }} onClick={() => camRef.current?.click()}>
            📷 Take photo
          </button>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => libRef.current?.click()}>
            Library
          </button>
        </div>
      )}

      {file && (
        <button type="button" className="btn" disabled={busy} onClick={submit}>
          {busy ? "Uploading…" : "Upload photo"}
        </button>
      )}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
