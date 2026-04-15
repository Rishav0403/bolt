import { Show, For, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import FileExplorer from './FileExplorer';
import SearchPanel from './SearchPanel';
import GitPanel from './GitPanel';
import SettingsEditor from './SettingsEditor';
import { SearchIcon, GitIcon, ExtensionsIcon } from '../utils/icons';

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

/**
 * Data-driven sidebar view definitions.
 * Adding a new sidebar view is a single-line change here.
 */
const sidebarViews = [
  {
    id: 'explorer',
    title: 'EXPLORER',
    component: (props) => <FileExplorer rootPath={props.rootPath} />,
  },
  {
    id: 'search',
    title: 'SEARCH',
    component: (props) => <SearchPanel rootPath={props.rootPath} />,
  },
  {
    id: 'git',
    title: 'SOURCE CONTROL',
    component: (props) => <GitPanel rootPath={props.rootPath} />,
  },
  {
    id: 'extensions',
    title: 'EXTENSIONS',
    component: () => <PlaceholderView icon={<ExtensionsIcon size={48} strokeWidth={1} opacity={0.3} />} title="Extensions" hint="Coming in Phase 5" />,
  },
  {
    id: 'settings',
    title: 'SETTINGS',
    component: (props) => <SettingsEditor rootPath={props.rootPath} />,
  },
];

const viewMap = Object.fromEntries(sidebarViews.map(v => [v.id, v]));

export default function Sidebar(props) {
  const currentView = createMemo(() => {
    const id = props.activeView();
    return id ? viewMap[id] || null : null;
  });

  return (
    <Show when={currentView()}>
      <div class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">{currentView().title}</span>
        </div>
        <div class="sidebar-content">
          {currentView().component(props)}
        </div>
      </div>
    </Show>
  );
}
