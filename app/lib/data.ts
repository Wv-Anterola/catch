import fs from "node:fs";
import path from "node:path";
import type { Manifest, QueueRow, CityStat, Hospital, EquityData } from "./types";

// Reads the static JSON bundle (public/data) that the Python ETL emits. Used only in
// server components, which run at build time, so the exported site ships no database.

const DATA_DIR = path.join(process.cwd(), "public", "data");

function read<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8")) as T;
}

// The bundle is immutable per build, so cache it.
let _manifest: Manifest | null = null;
export function getManifest(): Manifest {
  if (!_manifest) _manifest = read<Manifest>("manifest.json");
  return _manifest;
}

let _queue: QueueRow[] | null = null;
export function getQueue(): QueueRow[] {
  if (!_queue) _queue = read<QueueRow[]>("queue.json");
  return _queue;
}

let _geo: { cities: CityStat[]; hospitals: Hospital[] } | null = null;
function geo() {
  if (!_geo) _geo = read<{ cities: CityStat[]; hospitals: Hospital[] }>("geography.json");
  return _geo;
}
export function getCityStats(): CityStat[] {
  return geo().cities;
}
export function getHospitals(): Hospital[] {
  return geo().hospitals;
}

let _equity: EquityData | null = null;
export function getEquity(): EquityData {
  if (!_equity) _equity = read<EquityData>("equity.json");
  return _equity;
}
