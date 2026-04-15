import { For } from 'solid-js';
import { ExplorerIcon, SearchIcon, GitIcon, ExtensionsIcon, SettingsIcon } from '../utils/icons';

const topItems = [
  { id: 'explorer', icon: (p) => <ExplorerIcon {...p} />, title: 'Explorer (Ctrl+Shift+E)' },
  { id: 'search', icon: (p) => <SearchIcon {...p} />, title: 'Search (Ctrl+Shift+F)' },
  { id: 'git', icon: (p) => <GitIcon {...p} />, title: 'Source Control (Ctrl+Shift+G)' },
  { id: 'extensions', icon: (p) => <ExtensionsIcon {...p} />, title: 'Extensions (Ctrl+Shift+X)' },
];

const bottomItems = [
  { id: 'settings', icon: (p) => <SettingsIcon {...p} />, title: 'Settings' },
];

export default function ActivityBar(props) {
  return (
    <div class="activity-bar">
      <div class="activity-bar-top">
        <For each={topItems}>
          {(item) => (
            <button
              class="activity-bar-item"
              classList={{ active: props.activeView() === item.id }}
              onClick={() => props.onViewChange(props.activeView() === item.id ? null : item.id)}
              title={item.title}
            >
              {item.icon({ size: 24 })}
            </button>
          )}
        </For>
      </div>
      <div class="activity-bar-bottom">
        <For each={bottomItems}>
          {(item) => (
            <button
              class="activity-bar-item"
              classList={{ active: props.activeView() === item.id }}
              onClick={() => props.onViewChange(item.id)}
              title={item.title}
            >
              {item.icon({ size: 24 })}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
