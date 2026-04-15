import { Show } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';

export default function StatusBar() {
  const { activeTab } = useEditor();

  return (
    <div class="status-bar">
      <div class="status-bar-left">
        <span class="status-bar-item clickable" title="Source Control">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M12 8V16" />
          </svg>
          <span>main</span>
        </span>
      </div>
      <div class="status-bar-right">
        <Show when={activeTab()}>
          <span class="status-bar-item">Ln 1, Col 1</span>
          <span class="status-bar-item">{activeTab().language || 'Plain Text'}</span>
          <span class="status-bar-item">UTF-8</span>
        </Show>
        <span class="status-bar-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
          Bolt
        </span>
      </div>
    </div>
  );
}
