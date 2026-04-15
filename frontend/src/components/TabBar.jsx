import { Show, For } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { getFileIcon } from '../utils/fileIcons';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useEditor();

  function handleClose(e, id) {
    e.stopPropagation();
    closeTab(id);
  }

  return (
    <Show when={tabs.length > 0}>
      <div class="tab-bar">
        <div class="tab-bar-scroll">
          <For each={tabs}>
            {(tab) => {
              const icon = getFileIcon(tab.name);
              return (
                <div
                  class={`tab ${tab.id === activeTabId() ? 'active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                  title={tab.path}
                >
                  <span class="tab-icon" style={{ color: icon.color }}>
                    {icon.label}
                  </span>
                  <span class="tab-name truncate">{tab.name}</span>
                  <Show when={tab.isModified}>
                    <span class="tab-modified" />
                  </Show>
                  <button
                    class="tab-close"
                    onClick={(e) => handleClose(e, tab.id)}
                    title="Close"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
                    </svg>
                  </button>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
}
