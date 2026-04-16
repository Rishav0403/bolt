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

/**
 * Returns the Wails Terminal service proxy, or null if not in a Wails environment.
 * Methods: CreateTerminal, WriteTerminal, ResizeTerminal, CloseTerminal, ListTerminals.
 */
export function getWailsTerminal() {
  return window.go?.terminal?.Service ?? null;
}

/**
 * Returns the Wails Search service proxy, or null if not in a Wails environment.
 * Methods: Search, SearchStream, CancelSearch, Replace.
 */
export function getWailsSearch() {
  return window.go?.search?.Service ?? null;
}

/**
 * Returns the Wails Settings service proxy, or null if not in a Wails environment.
 * Methods: GetSettings, UpdateSetting, UpdateAllSettings, GetMergedSettings,
 *          SaveWorkspaceSettings, LoadWorkspaceSettings, GetSettingsSchema.
 */
export function getWailsSettings() {
  return window.go?.settings?.Service ?? null;
}

/**
 * Returns the Wails Git service proxy, or null if not in a Wails environment.
 * Methods: GetStatus, GetBranch, GetDiff, StageFile, UnstageFile, StageAll, UnstageAll,
 *          Commit, GetLog, ListBranches, CheckoutBranch, CreateBranch, DeleteBranch,
 *          GetFileAtRevision.
 */
export function getWailsGit() {
  return window.go?.git?.Service ?? null;
}
