// A template re-mounts on every navigation, so this gives each route a gentle
// opacity fade-in (see .page-enter in globals.css). Opacity only, no transform, so it
// never creates a containing block that would disturb sticky/fixed descendants.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
