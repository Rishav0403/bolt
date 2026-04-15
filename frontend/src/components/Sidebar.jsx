import { Show, Switch, Match } from 'solid-js';
import FileExplorer from './FileExplorer';

function PlaceholderView(props) {
  return (
    <div class="sidebar-placeholder">
      <Show when={props.icon}>
        <div class="sidebar-placeholder-icon">{props.icon}</div>
      </Show>
      <p>{props.title}</p>
      <p class="sidebar-placeholder-hint">{props.hint}</p>
    </div>
  );
}

const placeholderIcons = {
  search: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16L21 21" />
    </svg>
  ),
  git: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M12 8V16" />
      <path d="M12 8C12 10 14 12 16 12" />
    </svg>
  ),
  extensions: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
};

const titles = {
  explorer: 'EXPLORER',
  search: 'SEARCH',
  git: 'SOURCE CONTROL',
  extensions: 'EXTENSIONS',
  settings: 'SETTINGS',
};

export default function Sidebar(props) {
  return (
    <Show when={props.activeView()}>
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">{titles[props.activeView()] || ''}</span>
        </div>
        <div class="sidebar-content">
          <Switch>
            <Match when={props.activeView() === 'explorer'}>
              <FileExplorer rootPath={props.rootPath} />
            </Match>
            <Match when={props.activeView() === 'search'}>
              <PlaceholderView icon={placeholderIcons.search} title="Search" hint="Coming in Phase 2" />
            </Match>
            <Match when={props.activeView() === 'git'}>
              <PlaceholderView icon={placeholderIcons.git} title="Source Control" hint="Coming in Phase 4" />
            </Match>
            <Match when={props.activeView() === 'extensions'}>
              <PlaceholderView icon={placeholderIcons.extensions} title="Extensions" hint="Coming in Phase 5" />
            </Match>
            <Match when={props.activeView() === 'settings'}>
              <PlaceholderView title="Settings" hint="Coming soon" />
            </Match>
          </Switch>
        </div>
      </div>
    </Show>
  );
}
