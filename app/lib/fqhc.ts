// Rhode Island's Federally Qualified Health Centers (FQHCs) and their main sites.
// CATCH is built for FQHCs, so the map plots the real community health centers where
// it would deploy, not hospitals.
//
// Organizations are the real RI community health centers (source: RI Health Center
// Association / Neighborhood Health Plan of RI directory). Coordinates are the
// approximate community location of each listed site, used only as reference markers;
// they are not exact street addresses. Block Island Health Services is omitted because
// it sits off the mainland basemap.

export interface FqhcSite {
  org: string;
  city: string;
  lat: number;
  lon: number;
}

export const RI_FQHCS: FqhcSite[] = [
  { org: "Providence Community Health Centers", city: "Providence", lat: 41.823, lon: -71.412 },
  { org: "Blackstone Valley Community Health Care", city: "Pawtucket", lat: 41.878, lon: -71.382 },
  { org: "Blackstone Valley Community Health Care", city: "Central Falls", lat: 41.892, lon: -71.392 },
  { org: "Thundermist Health Center", city: "Woonsocket", lat: 42.003, lon: -71.515 },
  { org: "Thundermist Health Center", city: "West Warwick", lat: 41.697, lon: -71.523 },
  { org: "Thundermist Health Center", city: "Wakefield", lat: 41.442, lon: -71.500 },
  { org: "CCAP Family Health Services", city: "Cranston", lat: 41.780, lon: -71.437 },
  { org: "East Bay Community Action Program", city: "Newport", lat: 41.490, lon: -71.313 },
  { org: "East Bay Community Action Program", city: "East Providence", lat: 41.813, lon: -71.369 },
  { org: "WellOne Primary Medical & Dental Care", city: "Pascoag", lat: 41.955, lon: -71.703 },
  { org: "WellOne Primary Medical & Dental Care", city: "North Kingstown", lat: 41.567, lon: -71.446 },
  { org: "Tri-County Community Action Agency", city: "Johnston", lat: 41.822, lon: -71.506 },
  { org: "Wood River Health Services", city: "Hope Valley", lat: 41.510, lon: -71.717 },
];

// Great-circle distance in kilometers between two lat/lon points.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Assign each city with coordinates to the FQHC site nearest to it (a Voronoi
// partition by straight-line distance). Returns city -> index into `sites`. This is
// the catchment model: the communities a given FQHC is the closest care site for, so
// clicking an FQHC on the map can surface exactly the population it should target.
export function assignCitiesToNearestFqhc(
  cities: { city: string; lat: number | null; lon: number | null }[],
  sites: FqhcSite[] = RI_FQHCS,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cities) {
    if (c.lat == null || c.lon == null) continue;
    let best = -1;
    let min = Infinity;
    for (let i = 0; i < sites.length; i++) {
      const d = haversineKm(c.lat, c.lon, sites[i].lat, sites[i].lon);
      if (d < min) { min = d; best = i; }
    }
    if (best >= 0) out[c.city] = best;
  }
  return out;
}

// city -> { lat, lon } for the cities that have coordinates. Lets the client measure a
// patient's city to a specific chosen FQHC site (not just the nearest one).
export function cityCoordinates(
  cities: { city: string; lat: number | null; lon: number | null }[],
): Record<string, { lat: number; lon: number }> {
  const out: Record<string, { lat: number; lon: number }> = {};
  for (const c of cities) {
    if (c.lat == null || c.lon == null) continue;
    out[c.city] = { lat: c.lat, lon: c.lon };
  }
  return out;
}

export interface CatchmentStat {
  adults: number;
  flagged: number;
  undiagnosed: number;
  treated_uncontrolled: number;
  communities: number;
}

// True catchment totals per FQHC SITE, aggregated from the full city-level stats (which
// cover the entire flagged population, not just the top-ranked worklist). Keyed by index
// into RI_FQHCS. This is the honest denominator for "how many people is my specific site
// the nearest FQHC for", separate from the capped worklist shown in the queue.
export function catchmentStatsBySite(
  cities: {
    city: string; adults: number; flagged: number;
    undiagnosed: number; treated_uncontrolled: number;
    lat: number | null; lon: number | null;
  }[],
): Record<number, CatchmentStat> {
  const cityToSite = assignCitiesToNearestFqhc(cities);
  const out: Record<number, CatchmentStat> = {};
  for (const c of cities) {
    const i = cityToSite[c.city];
    if (i == null) continue;
    const s = (out[i] ??= { adults: 0, flagged: 0, undiagnosed: 0, treated_uncontrolled: 0, communities: 0 });
    s.adults += c.adults || 0;
    s.flagged += c.flagged || 0;
    s.undiagnosed += c.undiagnosed || 0;
    s.treated_uncontrolled += c.treated_uncontrolled || 0;
    s.communities += 1;
  }
  return out;
}

// For each city with coordinates, the straight-line distance (km) to the nearest RI
// FQHC site. Queue rows only carry a city (not per-patient coordinates), so this is a
// city-centroid proxy for a patient's travel burden to community-health-center care,
// used to sort the worklist by access distance. Cities without coordinates are omitted.
export function cityDistanceToNearestFqhc(
  cities: { city: string; lat: number | null; lon: number | null }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cities) {
    if (c.lat == null || c.lon == null) continue;
    let min = Infinity;
    for (const f of RI_FQHCS) {
      const d = haversineKm(c.lat, c.lon, f.lat, f.lon);
      if (d < min) min = d;
    }
    if (Number.isFinite(min)) out[c.city] = min;
  }
  return out;
}
