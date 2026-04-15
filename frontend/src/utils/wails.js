/**
 * Check if the app is running inside a Wails desktop environment
 * (i.e., the Go backend bindings are available).
 */
export function isWailsEnv() {
  return typeof window !== 'undefined' && !!window.go?.fs?.Service;
}

/**
 * Returns the Wails FS service proxy, or null if not in a Wails environment.
 */
export function getWailsFs() {
  return isWailsEnv() ? window.go.fs.Service : null;
}

/**
 * Returns the Wails TextBuffer service proxy, or null if not in a Wails environment.
 * Methods: OpenBuffer, CloseBuffer, Insert, Delete, GetContent, GetLines, LineCount, Stats.
 */
export function getWailsTextBuffer() {
  return window.go?.textbuffer?.Service ?? null;
}
