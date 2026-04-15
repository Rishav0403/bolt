/**
 * Shared mapping from file extensions to icon color and label.
 * Used by TreeNode (file tree) and TabBar (tab icons).
 */
const fileIconConfig = {
  js:   { color: '#e8d44d', label: 'JS' },
  jsx:  { color: '#61dafb', label: 'JSX' },
  ts:   { color: '#3178c6', label: 'TS' },
  tsx:  { color: '#3178c6', label: 'TSX' },
  go:   { color: '#00add8', label: 'GO' },
  py:   { color: '#3776ab', label: 'PY' },
  rs:   { color: '#dea584', label: 'RS' },
  rb:   { color: '#cc342d', label: 'RB' },
  java: { color: '#b07219', label: 'JA' },
  c:    { color: '#555555', label: 'C' },
  cpp:  { color: '#f34b7d', label: 'C+' },
  h:    { color: '#555555', label: 'H' },
  html: { color: '#e34c26', label: 'H' },
  htm:  { color: '#e34c26', label: 'H' },
  css:  { color: '#563d7c', label: 'C' },
  scss: { color: '#c6538c', label: 'SC' },
  json: { color: '#cbcb41', label: '{}' },
  yaml: { color: '#cb171e', label: 'Y' },
  yml:  { color: '#cb171e', label: 'Y' },
  toml: { color: '#9c4221', label: 'TM' },
  md:   { color: '#519aba', label: 'M' },
  xml:  { color: '#e37933', label: 'X' },
  sql:  { color: '#e38c00', label: 'Q' },
  sh:   { color: '#89e051', label: '$' },
  txt:  { color: '#969696', label: '.' },
  mod:  { color: '#00add8', label: 'GO' },
  sum:  { color: '#969696', label: '.' },
};

const DEFAULT_ICON = { color: '#969696', label: '.' };

/**
 * Get the icon color for a file extension (used by TreeNode).
 */
export function getExtColor(ext) {
  return (fileIconConfig[ext] || DEFAULT_ICON).color;
}

/**
 * Get the full icon config { color, label } for a filename (used by TabBar).
 */
export function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return fileIconConfig[ext] || DEFAULT_ICON;
}

export default fileIconConfig;
