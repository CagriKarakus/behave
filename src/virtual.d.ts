// scripts/content-plugin.ts tarafından üretilen sanal modüller.
declare module 'virtual:behave-index' {
  const index: { book: unknown; chapters: unknown[] };
  export default index;
}
declare module 'virtual:behave-chapters' {
  const loaders: Record<string, () => Promise<{ default: unknown }>>;
  export default loaders;
}
