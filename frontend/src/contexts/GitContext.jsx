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
  const [branches, setBranches] = createSignal([]);
  const [log, setLog] = createSignal([]);
  const [logLoading, setLogLoading] = createSignal(false);

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
      await fetchLog();
    } catch (err) { setError(err.message); }
  };

  const listBranches = async () => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode
      setBranches([
        { name: 'main', isCurrent: true, isRemote: false, lastCommit: 'a1b2c3d' },
        { name: 'feature/login', isCurrent: false, isRemote: false, lastCommit: 'e4f5g6h' },
        { name: 'fix/styles', isCurrent: false, isRemote: false, lastCommit: 'i7j8k9l' },
      ]);
      return;
    }
    if (!root) return;
    try {
      const result = await git.ListBranches(root);
      setBranches(result || []);
    } catch (err) { setError(err.message); }
  };

  const checkoutBranch = async (branchName) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode: toggle current branch
      setBranches(prev => prev.map(b => ({ ...b, isCurrent: b.name === branchName })));
      setBranch(prev => ({ ...prev, name: branchName }));
      return;
    }
    if (!root) return;
    try {
      await git.CheckoutBranch(root, branchName);
      await refresh();
      await listBranches();
    } catch (err) { setError(err.message); }
  };

  const createBranch = async (branchName) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode
      setBranches(prev => [
        ...prev.map(b => ({ ...b, isCurrent: false })),
        { name: branchName, isCurrent: true, isRemote: false, lastCommit: 'new' }
      ]);
      setBranch(prev => ({ ...prev, name: branchName }));
      return;
    }
    if (!root) return;
    try {
      await git.CreateBranch(root, branchName);
      await refresh();
      await listBranches();
    } catch (err) { setError(err.message); }
  };

  const deleteBranch = async (branchName) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      setBranches(prev => prev.filter(b => b.name !== branchName));
      return;
    }
    if (!root) return;
    try {
      await git.DeleteBranch(root, branchName);
      await listBranches();
    } catch (err) { setError(err.message); }
  };

  const fetchLog = async (limit = 50) => {
    const root = props.rootPath?.() || '';
    if (!git) {
      // Demo mode
      setLog([
        { hash: 'a1b2c3d4e5f6', shortHash: 'a1b2c3d', message: 'feat: add git integration', author: 'Developer', relativeTime: '2 hours ago' },
        { hash: 'b2c3d4e5f6g7', shortHash: 'b2c3d4e', message: 'fix: resolve merge conflict', author: 'Developer', relativeTime: '5 hours ago' },
        { hash: 'c3d4e5f6g7h8', shortHash: 'c3d4e5f', message: 'chore: update dependencies', author: 'Developer', relativeTime: '1 day ago' },
        { hash: 'd4e5f6g7h8i9', shortHash: 'd4e5f6g', message: 'feat: initial project setup', author: 'Developer', relativeTime: '3 days ago' },
      ]);
      return;
    }
    if (!root) return;
    setLogLoading(true);
    try {
      const result = await git.GetLog(root, limit);
      setLog(result || []);
    } catch (err) { setError(err.message); }
    finally { setLogLoading(false); }
  };

  // Auto-refresh when rootPath changes (accessing the signal for Solid tracking)
  createEffect(() => {
    props.rootPath?.();
    refresh();
    listBranches();
    fetchLog();
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
    status, branch, loading, error,
    refresh, stageFile, unstageFile, stageAll, unstageAll, commit,
    branches, log, logLoading,
    listBranches, checkoutBranch, createBranch, deleteBranch, fetchLog,
    rootPath: props.rootPath,
  };

  return <GitContext.Provider value={value}>{props.children}</GitContext.Provider>;
}

export function useGit() {
  const ctx = useContext(GitContext);
  if (!ctx) throw new Error('useGit must be used within GitProvider');
  return ctx;
}
