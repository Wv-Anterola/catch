// basePath is "" on Vercel/root hosting and "/<repo>" on GitHub project pages, set at
// build time (see next.config.ts). Static data lives under `${basePath}/data`.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function dataUrl(rel: string): string {
  return `${BASE_PATH}/data/${rel}`;
}

// Scope contact status to the dataset version so a rebuild never shows old ticks.
export function contactStoreKey(version: string): string {
  return `catch:contacted:${version}`;
}
