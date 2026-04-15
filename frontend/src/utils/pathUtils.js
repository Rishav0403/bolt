/**
 * Cross-platform path utilities.
 *
 * Go's filepath.Join uses OS-native separators, so on Windows paths
 * use backslashes. These helpers handle both '/' and '\\' so the
 * frontend works on all platforms.
 */

/**
 * Get the parent directory of a path (handles both / and \\ separators).
 */
export function parentDir(path) {
  // Find the last separator (either / or \)
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  if (lastSlash <= 0) return path;
  return path.substring(0, lastSlash);
}

/**
 * Join a parent path with a child name using the same separator style
 * as the parent path (to stay consistent with the backend).
 */
export function joinPath(parent, name) {
  // Use backslash if the parent path contains backslashes (Windows)
  const sep = parent.includes('\\') ? '\\' : '/';
  return `${parent}${sep}${name}`;
}

/**
 * Get the last segment (basename) of a path.
 */
export function baseName(path) {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}
