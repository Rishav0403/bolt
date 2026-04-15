import { Show } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { GitBranchIcon, BoltIcon } from '../utils/icons';

export default function StatusBar() {
  const { activeTab } = useEditor();

  return (
    <div class="status-bar">
      <div class="status-bar-left">
        <span class="status-bar-item clickable" title="Source Control">
          <GitBranchIcon />
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
          <BoltIcon />
          Bolt
        </span>
      </div>
    </div>
  );
}
