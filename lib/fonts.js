const FAMILIES = ["Space Grotesk", "JetBrains Mono"];

export async function preloadFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  const jobs = FAMILIES.flatMap((f) => [
    document.fonts.load(`500 100px "${f}"`).catch(() => null),
    document.fonts.load(`700 100px "${f}"`).catch(() => null)
  ]);
  await Promise.allSettled(jobs);
  await document.fonts.ready;
}
