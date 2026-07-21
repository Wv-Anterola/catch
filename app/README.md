# CATCH web app

The Next.js (App Router, TypeScript) front end for CATCH. It renders a fully
static site from the committed data bundle in `public/data`; there is no server
or database at runtime.

See the repository root `README.md` for the full picture: the offline data
pipeline, deployment, and the care-gap rules.

## Local development

```
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out
npm run lint
npm run typecheck
```

The optional build-time variable `NEXT_PUBLIC_BASE_PATH` sets a path prefix for
sub-path hosting (empty for Vercel or root, `/<repo>` for GitHub project pages).
