import { Show } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { useTerminal } from '../contexts/TerminalContext';
import { useGit } from '../contexts/GitContext';
import { GitBranchIcon, BoltIcon } from '../utils/icons';

export default function StatusBar() {
  const { activeTab, cursorPosition } = useEditor();
  const { terminals, togglePanel } = useTerminal();
  const { branch, status } = useGit();

  return (
    <div class="status-bar">
      <div class="status-bar-left">
        <span class="status-bar-item clickable" title="Source Control">
          <GitBranchIcon />
          <span>{branch().name || 'main'}</span>
        </span>
        <Show when={status().length > 0}>
          <span class="status-bar-item" title={`${status().length} pending changes`}>
            {status().length} change{status().length !== 1 ? 's' : ''}
          </span>
        </Show>
      </div>
      <div class="status-bar-right">
        <Show when={terminals.length > 0}>
          <span
            class="status-bar-item clickable"
            title="Toggle Terminal"
            onClick={() => togglePanel()}
          >
            {'\u{2588}'} {terminals.length} terminal{terminals.length !== 1 ? 's' : ''}
          </span>
        </Show>
        <Show when={activeTab()}>
          <span class="status-bar-item">
            Ln {cursorPosition().line}, Col {cursorPosition().column}
            {cursorPosition().selected > 0 ? ` (${cursorPosition().selected} selected)` : ''}
          </span>
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
