import { createContext, useContext, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { getWailsGit } from '../utils/wails';

const GitContext = createContext();

// Demo mode mock data — uses lowercase keys to match Go JSON tags
const DEMO_STATUS = [
  { path: 'src/App.jsx', status: 'modified', staged: false, oldPath: '' },
  { path: 'src/utils/helpers.js', status: 'modified', staged: true, oldPath: '' },
  { path: 'src/components/NewComponent.jsx', status: 'untracked', staged: false, oldPath: '' },
  { path: 'README.md', status: 'modified', staged: true, oldPath: '' },
];

const DEMO_BRANCH = { name: 'main', commit: 'a1b2c3d', ahead: 0, behind: 0 };

const EMPTY_BRANCH = { name: '', commit: '', ahead: 0, behind: 0 };

export function GitProvider(props) {
  const [status, setStatus] = createSignal([]);
  const [branch, setBranch] = createSignal(EMPTY_BRANCH);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);

  const git = getWailsGit();

  const refresh = async () => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode
      setStatus(DEMO_STATUS);
      setBranch(DEMO_BRANCH);
      return;
    }
    if (!root) return;

    setLoading(true);
    setError(null);
    try {
      const [statusResult, branchResult] = await Promise.all([
        git.GetStatus(root),
        git.GetBranch(root),
      ]);
      setStatus(statusResult || []);
      setBranch(branchResult || EMPTY_BRANCH);
    } catch (err) {
      setError(err.message || 'Git error');
      setStatus([]);
    } finally {
      setLoading(false);
    }
  };

  const stageFile = async (path) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode: toggle staged status
      setStatus(prev => prev.map(f => f.path === path ? { ...f, staged: true } : f));
      return;
    }
    try {
      await git.StageFile(root, path);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const unstageFile = async (path) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      setStatus(prev => prev.map(f => f.path === path ? { ...f, staged: false } : f));
      return;
    }
    try {
      await git.UnstageFile(root, path);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const stageAll = async () => {
    const root = props.rootPath?.() || '';
    if (!git) {
      setStatus(prev => prev.map(f => ({ ...f, staged: true })));
      return;
    }
    try {
      await git.StageAll(root);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const unstageAll = async () => {
    const root = props.rootPath?.() || '';
    if (!git) {
      setStatus(prev => prev.map(f => ({ ...f, staged: false })));
      return;
    }
    try {
      await git.UnstageAll(root);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const commit = async (message) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode: remove staged files from status
      setStatus(prev => prev.filter(f => !f.staged));
      return;
    }
    try {
      await git.Commit(root, message);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  // Auto-refresh when rootPath changes (accessing the signal for Solid tracking)
  createEffect(() => {
    props.rootPath?.();
    refresh();
  });

  // Refresh on interval when component is mounted (every 5 seconds)
  let intervalId;
  onMount(() => {
    intervalId = setInterval(refresh, 5000);
  });
  onCleanup(() => {
    if (intervalId) clearInterval(intervalId);
  });

  const value = {
    status,
    branch,
    loading,
    error,
    refresh,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    commit,
  };

  return <GitContext.Provider value={value}>{props.children}</GitContext.Provider>;
}

export function useGit() {
  const ctx = useContext(GitContext);
  if (!ctx) throw new Error('useGit must be used within GitProvider');
  return ctx;
}
