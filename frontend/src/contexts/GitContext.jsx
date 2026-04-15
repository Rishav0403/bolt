import { createContext, useContext, createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import { getWailsGit } from '../utils/wails';

const GitContext = createContext();

// Demo mode mock data
const DEMO_STATUS = [
  { Path: 'src/App.jsx', Status: 'modified', Staged: false, OldPath: '' },
  { Path: 'src/utils/helpers.js', Status: 'modified', Staged: true, OldPath: '' },
  { Path: 'src/components/NewComponent.jsx', Status: 'untracked', Staged: false, OldPath: '' },
  { Path: 'README.md', Status: 'modified', Staged: true, OldPath: '' },
];

const DEMO_BRANCH = { Name: 'main', Commit: 'a1b2c3d', Ahead: 0, Behind: 0 };

export function GitProvider(props) {
  const [status, setStatus] = createSignal([]);
  const [branch, setBranch] = createSignal({ Name: '', Commit: '', Ahead: 0, Behind: 0 });
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
      setBranch(branchResult || { Name: '', Commit: '', Ahead: 0, Behind: 0 });
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
      setStatus(prev => prev.map(f => f.Path === path ? { ...f, Staged: true } : f));
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
      setStatus(prev => prev.map(f => f.Path === path ? { ...f, Staged: false } : f));
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
      setStatus(prev => prev.map(f => ({ ...f, Staged: true })));
      return;
    }
    try {
      for (const f of status().filter(f => !f.Staged)) {
        await git.StageFile(root, f.Path);
      }
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const unstageAll = async () => {
    const root = props.rootPath?.() || '';
    if (!git) {
      setStatus(prev => prev.map(f => ({ ...f, Staged: false })));
      return;
    }
    try {
      for (const f of status().filter(f => f.Staged)) {
        await git.UnstageFile(root, f.Path);
      }
      await refresh();
    } catch (err) { setError(err.message); }
  };

  const commit = async (message) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode: remove staged files from status
      setStatus(prev => prev.filter(f => !f.Staged));
      return;
    }
    try {
      await git.Commit(root, message);
      await refresh();
    } catch (err) { setError(err.message); }
  };

  // Auto-refresh when rootPath changes
  createEffect(() => {
    const root = props.rootPath?.();
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
