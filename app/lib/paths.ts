// basePath is "" on Vercel/root hosting and "/<repo>" on GitHub project pages, set at
// build time (see next.config.ts). Static data lives under `${basePath}/data`.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function dataUrl(rel: string): string {
  return `${BASE_PATH}/data/${rel}`;
}

// Public asset (logo, icon) URL, basePath-aware so it resolves on project pages too.
export function assetUrl(rel: string): string {
  return `${BASE_PATH}/${rel.replace(/^\//, "")}`;
}

// Scope contact status to the dataset version so a rebuild never shows old ticks.
export function contactStoreKey(version: string): string {
  return `catch:contacted:${version}`;
}
