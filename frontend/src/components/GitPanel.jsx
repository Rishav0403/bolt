import { createSignal, Show, For, createMemo } from 'solid-js';
import { useGit } from '../contexts/GitContext';
import { GitBranchIcon } from '../utils/icons';
import DiffViewer from './DiffViewer';
import { getWailsFs, getWailsGit } from '../utils/wails';
import { getLanguageFromPath } from '../utils/fileIcons';

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
  const { status, branch, loading, error, stageFile, unstageFile, stageAll, unstageAll, commit, refresh,
          branches, log, logLoading, checkoutBranch, createBranch, deleteBranch, fetchLog, rootPath } = useGit();

  const [commitMessage, setCommitMessage] = createSignal('');
  const [stagedExpanded, setStagedExpanded] = createSignal(true);
  const [changesExpanded, setChangesExpanded] = createSignal(true);
  const [branchesExpanded, setBranchesExpanded] = createSignal(false);
  const [historyExpanded, setHistoryExpanded] = createSignal(false);
  const [newBranchName, setNewBranchName] = createSignal('');
  const [showNewBranch, setShowNewBranch] = createSignal(false);
  const [logLimit, setLogLimit] = createSignal(50);
  const [diffState, setDiffState] = createSignal(null); // { originalContent, modifiedContent, originalLabel, modifiedLabel, language, fileName }

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

  const openDiff = async (file) => {
    const rootVal = typeof rootPath === 'function' ? rootPath() : (rootPath || '');
    const git = getWailsGit();
    const fs = getWailsFs();

    let originalContent = '';
    let modifiedContent = '';
    let originalLabel = 'HEAD';
    let modifiedLabel = file.staged ? 'Staged' : 'Working Tree';

    if (!git) {
      // Demo mode
      originalContent = '// Original content from HEAD\nconst x = 1;\n';
      modifiedContent = '// Modified content\nconst x = 2;\nconst y = 3;\n';
    } else if (rootVal) {
      try {
        // For renames, load the original side from the old path; otherwise use the current path
        const originalPath = file.oldPath || file.path;
        originalContent = await git.GetFileAtRevision(rootVal, originalPath, 'HEAD') || '';

        if (file.staged) {
          // Staged: get from index
          modifiedContent = await git.GetFileAtRevision(rootVal, file.path, ':0') || '';
        } else if (file.status === 'deleted') {
          // Deleted files have no working tree content
          modifiedContent = '';
        } else {
          // Unstaged: read working tree file
          const fullPath = rootVal + '/' + file.path;
          try {
            modifiedContent = fs ? (await fs.ReadFile(fullPath) || '') : '';
          } catch {
            // File may not exist on disk (e.g., just deleted)
            modifiedContent = '';
          }
        }
      } catch (err) {
        console.error('Failed to load diff:', err);
        return;
      }
    }

    setDiffState({
      originalContent,
      modifiedContent,
      originalLabel,
      modifiedLabel,
      language: getLanguageFromPath(file.path),
      fileName: file.path,
    });
  };

  /** Reusable file row for staged / unstaged file lists. */
  function FileRow({ file, onAction, actionTitle, actionLabel }) {
    const info = statusInfo(file.status);
    const { name, dir } = splitPath(file.path);
    return (
      <div class="git-file-row" title={file.path} onClick={() => openDiff(file)} style={{ cursor: 'pointer' }}>
        <span class="git-file-name">{name}</span>
        <Show when={dir}>
          <span class="git-file-dir">{dir}</span>
        </Show>
        <span class="git-file-status" style={{ color: info.color }}>{info.letter}</span>
        <button
          class="git-file-action"
          onClick={(e) => { e.stopPropagation(); onAction(file.path); }}
          title={actionTitle}
        >
          {actionLabel}
        </button>
      </div>
    );
  }

  return (
    <div class="git-panel">
      <Show when={diffState()}>
        <DiffViewer
          originalContent={diffState().originalContent}
          modifiedContent={diffState().modifiedContent}
          originalLabel={`${diffState().fileName} (${diffState().originalLabel})`}
          modifiedLabel={`${diffState().fileName} (${diffState().modifiedLabel})`}
          language={diffState().language}
          onClose={() => setDiffState(null)}
        />
      </Show>

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
                {(file) => <FileRow file={file} onAction={unstageFile} actionTitle="Unstage" actionLabel="−" />}
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
                {(file) => <FileRow file={file} onAction={stageFile} actionTitle="Stage" actionLabel="+" />}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Branches section */}
      <div class="git-section">
        <div
          class="git-section-header"
          onClick={() => setBranchesExpanded(!branchesExpanded())}
        >
          <span class="git-section-chevron">{branchesExpanded() ? '▼' : '▶'}</span>
          <span class="git-section-title">BRANCHES</span>
          <span class="git-section-count">{branches().length}</span>
          <button
            class="git-section-action"
            onClick={(e) => { e.stopPropagation(); setShowNewBranch(!showNewBranch()); }}
            title="New Branch"
          >
            +
          </button>
        </div>
        <Show when={branchesExpanded()}>
          <Show when={showNewBranch()}>
            <div class="git-new-branch">
              <input
                type="text"
                class="git-new-branch-input"
                placeholder="Branch name..."
                value={newBranchName()}
                onInput={(e) => setNewBranchName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBranchName().trim()) {
                    createBranch(newBranchName().trim());
                    setNewBranchName('');
                    setShowNewBranch(false);
                  }
                  if (e.key === 'Escape') {
                    setShowNewBranch(false);
                    setNewBranchName('');
                  }
                }}
              />
            </div>
          </Show>
          <div class="git-file-list">
            <For each={branches()}>
              {(b) => (
                <div
                  class={`git-branch-row ${b.isCurrent ? 'current' : ''}`}
                  onClick={() => {
                    if (!b.isCurrent && (status().length === 0 || confirm('You have uncommitted changes. Switch branch anyway?'))) {
                      checkoutBranch(b.name);
                    }
                  }}
                >
                  <span class="git-branch-icon">{b.isCurrent ? '●' : '○'}</span>
                  <span class="git-branch-row-name">{b.name}</span>
                  <span class="git-branch-row-commit">{b.lastCommit}</span>
                  <Show when={!b.isCurrent}>
                    <button
                      class="git-file-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete branch "${b.name}"?`)) {
                          deleteBranch(b.name);
                        }
                      }}
                      title="Delete Branch"
                    >
                      ×
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Commit History section */}
      <div class="git-section">
        <div
          class="git-section-header"
          onClick={() => setHistoryExpanded(!historyExpanded())}
        >
          <span class="git-section-chevron">{historyExpanded() ? '▼' : '▶'}</span>
          <span class="git-section-title">COMMIT HISTORY</span>
          <span class="git-section-count">{log().length}</span>
        </div>
        <Show when={historyExpanded()}>
          <Show when={logLoading()}>
            <div class="git-loading">Loading history...</div>
          </Show>
          <div class="git-file-list">
            <For each={log()}>
              {(entry) => (
                <div class="git-log-row" title={entry.hash}>
                  <div class="git-log-header">
                    <span class="git-log-hash">{entry.shortHash}</span>
                    <span class="git-log-time">{entry.relativeTime}</span>
                  </div>
                  <div class="git-log-message">{entry.message}</div>
                  <div class="git-log-author">{entry.author}</div>
                </div>
              )}
            </For>
          </div>
          <Show when={log().length >= logLimit()}>
            <button
              class="git-load-more"
              onClick={() => {
                const newLimit = logLimit() + 50;
                setLogLimit(newLimit);
                fetchLog(newLimit);
              }}
            >
              Load More
            </button>
          </Show>
        </Show>
      </div>
    </div>
  );
}
