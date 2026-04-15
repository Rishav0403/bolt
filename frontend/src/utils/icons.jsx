/**
 * Shared SVG icon components used across ActivityBar, Sidebar,
 * CommandPalette, and StatusBar.
 *
 * Each export is a function that returns a fresh SVG DOM node
 * (required by SolidJS to avoid moving a single node instance).
 */

export function SearchIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 1.5} opacity={props.opacity ?? 1} class={props.class}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16L21 21" />
    </svg>
  );
}

export function GitIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 1.5} opacity={props.opacity ?? 1} class={props.class}>
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M12 8V16" />
      <path d="M12 8C12 10 14 12 16 12" />
    </svg>
  );
}

export function ExtensionsIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 1.5} opacity={props.opacity ?? 1} class={props.class}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

export function ExplorerIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 1.5} opacity={props.opacity ?? 1} class={props.class}>
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 1.5} opacity={props.opacity ?? 1} class={props.class}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" />
    </svg>
  );
}

export function GitBranchIcon(props) {
  return (
    <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 2} class={props.class}>
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M12 8V16" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg width={props.size || 14} height={props.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={props.strokeWidth || 2} opacity={props.opacity ?? 1} class={props.class}>
      <path d="M12 2L2 7L12 12L22 7L12 2Z" />
      <path d="M2 17L12 22L22 17" />
      <path d="M2 12L12 17L22 12" />
    </svg>
  );
}
