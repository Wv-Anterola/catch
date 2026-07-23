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
