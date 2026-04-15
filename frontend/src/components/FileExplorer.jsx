import { createSignal, createEffect, Show, For } from 'solid-js';
import TreeNode from './TreeNode';
import { useEditor } from '../contexts/EditorContext';
import { getWailsFs } from '../utils/wails';
import { baseName } from '../utils/pathUtils';
import { DEMO_TREE, DEMO_CONTENTS } from '../utils/demoData';

export default function FileExplorer(props) {
  const [tree, setTree] = createSignal([]);
  const [projectName, setProjectName] = createSignal('');
  const { openFile } = useEditor();

  async function loadTree() {
    const fs = getWailsFs();
    const rp = props.rootPath();
    if (fs && rp) {
      try {
        const result = await fs.ListDir(rp);
        setTree(result || []);
        setProjectName(baseName(rp) || rp);
      } catch (err) {
        console.error('Failed to load directory:', err);
      }
    } else if (fs && !rp) {
      // Wails env but no folder opened — show empty state
      setTree([]);
      setProjectName('');
    } else {
      // Demo mode for browser preview (non-Wails)
      setTree(DEMO_TREE);
      setProjectName('bolt-editor');
    }
  }

  // Reload tree when rootPath changes
  createEffect(() => {
    // Access the signal to track it
    props.rootPath();
    loadTree();
  });

  async function handleFileClick(entry) {
    const fs = getWailsFs();
    if (fs) {
      try {
        const content = await fs.ReadFile(entry.path);
        openFile(entry.path, entry.name, content);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    } else {
      // Demo mode
      const content = DEMO_CONTENTS[entry.path] || `// ${entry.name}\n// File content would be loaded from disk in the desktop app`;
      openFile(entry.path, entry.name, content);
    }
  }

  return (
    <div class="file-explorer">
      <Show when={projectName()}>
        <div class="file-explorer-project">
          <span class="file-explorer-project-name truncate">{projectName().toUpperCase()}</span>
        </div>
      </Show>
      <div class="file-explorer-tree">
        <For each={tree()}>
          {(entry) => (
            <TreeNode
              entry={entry}
              depth={0}
              onFileClick={handleFileClick}
              onRefreshDir={loadTree}
            />
          )}
        </For>
      </div>
    </div>
  );
}
