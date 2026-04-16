import { createSignal, createMemo, Show, For, createEffect } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { getWailsFs } from '../utils/wails';

/**
 * Simple fuzzy match: checks if all characters of the query appear
 * in order within the target string (case-insensitive).
 * Returns a score (lower is better) or -1 if no match.
 */
function fuzzyMatch(query, target) {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      score += (ti === lastMatchIndex + 1) ? 0 : (ti - (lastMatchIndex + 1));
      lastMatchIndex = ti;
      qi++;
    }
  }

  if (qi < q.length) return -1; // not all chars matched
  // Bonus for matching at start of filename
  const filename = target.split('/').pop() || target;
  if (filename.toLowerCase().startsWith(q)) score -= 100;
  return score;
}

export default function QuickFileOpen(props) {
  const { openFile } = useEditor();
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [allFiles, setAllFiles] = createSignal([]);
  let inputRef;

  // Fetch file list when opened
  const loadFiles = async () => {
    const rootPath = props.rootPath?.() || '';
    const fs = getWailsFs();
    if (fs && rootPath) {
      try {
        const files = await fs.ListAllFiles(rootPath);
        setAllFiles(files || []);
      } catch (err) {
        console.error('Failed to list files:', err);
        setAllFiles([]);
      }
    } else {
      // Demo mode
      setAllFiles([
        'src/App.jsx',
        'src/components/EditorPane.jsx',
        'src/components/StatusBar.jsx',
        'src/components/Sidebar.jsx',
        'src/components/GitPanel.jsx',
        'src/contexts/EditorContext.jsx',
        'src/contexts/GitContext.jsx',
        'src/utils/wails.js',
        'src/style.css',
        'README.md',
        'package.json',
      ]);
    }
  };

  const filteredFiles = createMemo(() => {
    const q = query().trim();
    const files = allFiles();
    if (!q) return files.slice(0, 50); // show first 50 when no query

    const scored = [];
    for (const file of files) {
      const score = fuzzyMatch(q, file);
      if (score !== -1) {
        scored.push({ file, score });
      }
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 50).map(s => s.file);
  });

  const handleKeyDown = (e) => {
    const items = filteredFiles();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = items[selectedIndex()];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      props.onClose?.();
    }
  };

  const handleSelect = async (filePath) => {
    const rootPath = props.rootPath?.() || '';
    const fs = getWailsFs();
    const name = filePath.split('/').pop() || filePath;

    if (fs && rootPath) {
      try {
        const fullPath = rootPath + '/' + filePath;
        const content = await fs.ReadFile(fullPath);
        openFile(fullPath, name, content);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    } else {
      // Demo mode: open with empty content
      openFile(filePath, name, '// ' + filePath);
    }
    props.onClose?.();
  };

  // Reload file list whenever the modal opens or rootPath changes (not just on initial mount)
  createEffect(() => {
    const isOpen = props.isOpen?.();
    const _rootPath = props.rootPath?.(); // track rootPath changes
    if (isOpen) {
      loadFiles();
      // Reset query and selection when reopening
      setQuery('');
      setSelectedIndex(0);
      // Focus the input after a microtask to ensure the DOM is rendered
      queueMicrotask(() => inputRef?.focus());
    }
  });

  return (
    <Show when={props.isOpen?.()}>
      <div class="command-palette-overlay" onClick={() => props.onClose?.()}>
        <div class="command-palette" onClick={(e) => e.stopPropagation()}>
          <div class="command-palette-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              class="command-palette-input"
              placeholder="Search files by name..."
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div class="command-palette-list">
            <For each={filteredFiles()}>
              {(file, index) => {
                const name = file.split('/').pop() || file;
                const dir = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : '';
                return (
                  <div
                    class={`command-palette-item ${index() === selectedIndex() ? 'selected' : ''}`}
                    onClick={() => handleSelect(file)}
                    onMouseEnter={() => setSelectedIndex(index())}
                  >
                    <span class="quick-file-name">{name}</span>
                    <Show when={dir}>
                      <span class="quick-file-dir">{dir}</span>
                    </Show>
                  </div>
                );
              }}
            </For>
            <Show when={filteredFiles().length === 0}>
              <div class="command-palette-empty">No matching files</div>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}
