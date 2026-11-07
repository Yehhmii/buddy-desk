/**
 * Content-Security-Policy for the renderer. Injected into index.html at build time
 * (see electron.vite.config.ts) so dev and prod can differ in one place only.
 *
 * 'wasm-unsafe-eval' and 'unsafe-eval' are required by the Vosk wake-word engine: its worker is built
 * with Emscripten, which compiles WebAssembly and uses new Function(). The page loads no remote
 * scripts and renders no raw HTML, so the practical exposure is small. If the wake word is ever
 * moved to its own window, only that window needs the relaxed policy.
 * worker-src blob: is required because vosk-browser spawns its worker from a blob.
 * buddy-models: is the local protocol that serves the downloaded wake-word model.
 */
const base = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: buddy-shots:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
];

export function buildCsp(isDev: boolean, devOrigin = 'http://localhost:5173'): string {
  const connect = isDev
    ? `connect-src 'self' data: buddy-models: ${devOrigin} ws://localhost:*`
    : "connect-src 'self' data: buddy-models:";
  const script = isDev
    ? "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'";
  return [...base.map((d) => (d.startsWith('script-src') ? script : d)), connect].join('; ');
}
