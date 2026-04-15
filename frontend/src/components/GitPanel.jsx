import { createSignal, Show, For, createMemo } from 'solid-js';
import { useGit } from '../contexts/GitContext';
import { GitBranchIcon } from '../utils/icons';

/**
 * Get status letter and color for a file status.
 */
function statusInfo(status) {
  switch (status) {
    case 'modified':
      return { letter: 'M', color: 'var(--warning)' };
    case 'added':
      return { letter: 'A', color: 'var(--success)' };
    case 'deleted':
      return { letter: 'D', color: 'var(--danger)' };
    case 'untracked':
      return { letter: 'U', color: 'var(--text-muted)' };
    case 'renamed':
      return { letter: 'R', color: 'var(--info)' };
    case 'conflict':
      return { letter: 'C', color: 'var(--danger)' };
    default:
      return { letter: '?', color: 'var(--text-muted)' };
  }
}

/**
 * Extract the filename (last path segment) and directory from a path.
 */
function splitPath(filePath) {
  if (!filePath) return { name: '', dir: '' };
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return { name: filePath, dir: '' };
  return {
    name: filePath.substring(lastSlash + 1),
    dir: filePath.substring(0, lastSlash),
  };
}

export default function GitPanel() {
  const { status, branch, loading, error, stageFile, unstageFile, stageAll, unstageAll, commit, refresh } = useGit();

  const [commitMessage, setCommitMessage] = createSignal('');
  const [stagedExpanded, setStagedExpanded] = createSignal(true);
  const [changesExpanded, setChangesExpanded] = createSignal(true);

  const stagedFiles = createMemo(() => status().filter(f => f.staged));
  const unstagedFiles = createMemo(() => status().filter(f => !f.staged));

  const handleCommit = async () => {
    const msg = commitMessage().trim();
    if (!msg || stagedFiles().length === 0) return;
    await commit(msg);
    setCommitMessage('');
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div class="git-panel">
      {/* Branch info bar */}
      <div class="git-branch-bar">
        <GitBranchIcon />
        <span class="git-branch-name">{branch().name || 'No branch'}</span>
        <Show when={branch().commit}>
          <span class="git-branch-commit">{branch().commit}</span>
        </Show>
        <button
          class="git-refresh-btn"
          onClick={refresh}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Error display */}
      <Show when={error()}>
        <div class="git-error">{error()}</div>
      </Show>

      {/* Commit section */}
      <div class="git-commit-section">
        <textarea
          class="git-commit-input"
          placeholder="Message (Ctrl+Enter to commit)"
          value={commitMessage()}
          onInput={(e) => setCommitMessage(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          rows="3"
        />
        <button
          class="git-commit-btn"
          disabled={!commitMessage().trim() || stagedFiles().length === 0}
          onClick={handleCommit}
        >
          Commit{stagedFiles().length > 0 ? ` (${stagedFiles().length} file${stagedFiles().length !== 1 ? 's' : ''})` : ''}
        </button>
      </div>

      {/* Loading indicator */}
      <Show when={loading()}>
        <div class="git-loading">Refreshing...</div>
      </Show>

      {/* Empty state */}
      <Show when={!loading() && status().length === 0 && !error()}>
        <div class="git-empty">
          <span class="git-empty-icon">✓</span>
          <span>No changes</span>
        </div>
      </Show>

      {/* Staged changes section */}
      <Show when={stagedFiles().length > 0}>
        <div class="git-section">
          <div
            class="git-section-header"
            onClick={() => setStagedExpanded(!stagedExpanded())}
          >
            <span class="git-section-chevron">{stagedExpanded() ? '▼' : '▶'}</span>
            <span class="git-section-title">STAGED CHANGES</span>
            <span class="git-section-count">{stagedFiles().length}</span>
            <button
              class="git-section-action"
              onClick={(e) => { e.stopPropagation(); unstageAll(); }}
              title="Unstage All"
            >
              −
            </button>
          </div>
          <Show when={stagedExpanded()}>
            <div class="git-file-list">
              <For each={stagedFiles()}>
                {(file) => {
                  const info = statusInfo(file.status);
                  const { name, dir } = splitPath(file.path);
                  return (
                    <div class="git-file-row" title={file.path}>
                      <span class="git-file-name">{name}</span>
                      <Show when={dir}>
                        <span class="git-file-dir">{dir}</span>
                      </Show>
                      <span class="git-file-status" style={{ color: info.color }}>{info.letter}</span>
                      <button
                        class="git-file-action"
                        onClick={() => unstageFile(file.path)}
                        title="Unstage"
                      >
                        −
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Changes (unstaged) section */}
      <Show when={unstagedFiles().length > 0}>
        <div class="git-section">
          <div
            class="git-section-header"
            onClick={() => setChangesExpanded(!changesExpanded())}
          >
            <span class="git-section-chevron">{changesExpanded() ? '▼' : '▶'}</span>
            <span class="git-section-title">CHANGES</span>
            <span class="git-section-count">{unstagedFiles().length}</span>
            <button
              class="git-section-action"
              onClick={(e) => { e.stopPropagation(); stageAll(); }}
              title="Stage All"
            >
              +
            </button>
          </div>
          <Show when={changesExpanded()}>
            <div class="git-file-list">
              <For each={unstagedFiles()}>
                {(file) => {
                  const info = statusInfo(file.status);
                  const { name, dir } = splitPath(file.path);
                  return (
                    <div class="git-file-row" title={file.path}>
                      <span class="git-file-name">{name}</span>
                      <Show when={dir}>
                        <span class="git-file-dir">{dir}</span>
                      </Show>
                      <span class="git-file-status" style={{ color: info.color }}>{info.letter}</span>
                      <button
                        class="git-file-action"
                        onClick={() => stageFile(file.path)}
                        title="Stage"
                      >
                        +
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
