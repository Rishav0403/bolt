/**
 * Shared mapping from file extensions to icon color, label, and language.
 * Used by TreeNode (file tree), TabBar (tab icons), and EditorContext
 * (Monaco language detection).
 *
 * This is the single source of truth for extension metadata —
 * add new extensions here and all consumers pick them up automatically.
 */
const fileIconConfig = {
  js:   { color: '#e8d44d', label: 'JS',  language: 'javascript' },
  jsx:  { color: '#61dafb', label: 'JSX', language: 'javascript' },
  ts:   { color: '#3178c6', label: 'TS',  language: 'typescript' },
  tsx:  { color: '#3178c6', label: 'TSX', language: 'typescript' },
  go:   { color: '#00add8', label: 'GO',  language: 'go' },
  py:   { color: '#3776ab', label: 'PY',  language: 'python' },
  rs:   { color: '#dea584', label: 'RS',  language: 'rust' },
  rb:   { color: '#cc342d', label: 'RB',  language: 'ruby' },
  java: { color: '#b07219', label: 'JA',  language: 'java' },
  c:    { color: '#555555', label: 'C',   language: 'c' },
  cpp:  { color: '#f34b7d', label: 'C+',  language: 'cpp' },
  h:    { color: '#555555', label: 'H',   language: 'c' },
  hpp:  { color: '#f34b7d', label: 'H+',  language: 'cpp' },
  html: { color: '#e34c26', label: 'H',   language: 'html' },
  htm:  { color: '#e34c26', label: 'H',   language: 'html' },
  css:  { color: '#563d7c', label: 'C',   language: 'css' },
  scss: { color: '#c6538c', label: 'SC',  language: 'scss' },
  less: { color: '#563d7c', label: 'LE',  language: 'less' },
  json: { color: '#cbcb41', label: '{}',  language: 'json' },
  yaml: { color: '#cb171e', label: 'Y',   language: 'yaml' },
  yml:  { color: '#cb171e', label: 'Y',   language: 'yaml' },
  toml: { color: '#9c4221', label: 'TM',  language: 'toml' },
  md:   { color: '#519aba', label: 'M',   language: 'markdown' },
  xml:  { color: '#e37933', label: 'X',   language: 'xml' },
  sql:  { color: '#e38c00', label: 'Q',   language: 'sql' },
  sh:   { color: '#89e051', label: '$',   language: 'shell' },
  txt:  { color: '#969696', label: '.',   language: 'plaintext' },
  mod:  { color: '#00add8', label: 'GO',  language: 'go' },
  sum:  { color: '#969696', label: '.',   language: 'plaintext' },
};

/** Known full-filename → language mappings (no extension needed). */
const knownFileNames = {
  makefile: 'makefile',
  dockerfile: 'dockerfile',
};

const DEFAULT_ICON = { color: '#969696', label: '.', language: 'plaintext' };

/**
 * Get the icon color for a file extension (used by TreeNode).
 */
export function getExtColor(ext) {
  return (fileIconConfig[ext] || DEFAULT_ICON).color;
}

/**
 * Get the full icon config { color, label, language } for a filename (used by TabBar).
 */
export function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return fileIconConfig[ext] || DEFAULT_ICON;
}

/**
 * Get the Monaco language ID for a file path.
 * Checks full filename first (e.g. Makefile), then extension.
 */
export function getLanguageFromPath(path) {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const name = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

  const nameLower = name.toLowerCase();
  if (knownFileNames[nameLower]) return knownFileNames[nameLower];

  const dotIdx = name.lastIndexOf('.');
  if (dotIdx <= 0) return 'plaintext';
  const ext = name.substring(dotIdx + 1).toLowerCase();

  return (fileIconConfig[ext] || DEFAULT_ICON).language;
}
