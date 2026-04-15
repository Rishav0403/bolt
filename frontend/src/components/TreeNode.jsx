import { createSignal, Show, For } from 'solid-js';
import { getWailsFs } from '../utils/wails';
import { getExtColor } from '../utils/fileIcons';
import { parentDir, joinPath } from '../utils/pathUtils';

const FOLDER_ICON_PATH = "M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z";

export default function TreeNode(props) {
  const [expanded, setExpanded] = createSignal(false);
  const [children, setChildren] = createSignal(props.entry.children || []);
  const [loading, setLoading] = createSignal(false);
  const [contextMenu, setContextMenu] = createSignal(null);

  async function toggleExpand() {
    if (!props.entry.isDir) return;

    const fs = getWailsFs();
    if (!expanded() && fs) {
      setLoading(true);
      try {
        const result = await fs.ListDir(props.entry.path);
        setChildren(result || []);
      } catch (err) {
        console.error('Failed to list dir:', err);
      }
      setLoading(false);
    }
    setExpanded(prev => !prev);
  }

  function handleClick() {
    if (props.entry.isDir) {
      toggleExpand();
    } else {
      props.onFileClick?.(props.entry);
    }
  }

  function handleContextMenu(e) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  async function handleContextAction(action) {
    closeContextMenu();
    const fs = getWailsFs();
    if (!fs) return;

    try {
      switch (action) {
        case 'newFile': {
          const name = prompt('File name:');
          if (!name) return;
          const dir = props.entry.isDir ? props.entry.path : parentDir(props.entry.path);
          await fs.CreateFile(joinPath(dir, name));
          props.onRefreshDir?.();
          break;
        }
        case 'newFolder': {
          const name = prompt('Folder name:');
          if (!name) return;
          const dir = props.entry.isDir ? props.entry.path : parentDir(props.entry.path);
          await fs.CreateDir(joinPath(dir, name));
          props.onRefreshDir?.();
          break;
        }
        case 'rename': {
          const newName = prompt('New name:', props.entry.name);
          if (!newName || newName === props.entry.name) return;
          const dir = parentDir(props.entry.path);
          await fs.RenamePath(props.entry.path, joinPath(dir, newName));
          props.onRefreshDir?.();
          break;
        }
        case 'delete': {
          if (confirm(`Delete "${props.entry.name}"?`)) {
            await fs.DeletePath(props.entry.path);
            props.onRefreshDir?.();
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  }

  return (
    <>
      <div
        class="tree-node"
        style={{ "padding-left": `${(props.depth || 0) * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span class="tree-node-arrow">
          {props.entry.isDir ? (
            <svg
              width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
              style={{ transform: expanded() ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}
            >
              <path d="M6 4l4 4-4 4V4z" />
            </svg>
          ) : (
            <span style={{ width: '12px' }} />
          )}
        </span>

        {props.entry.isDir ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={expanded() ? '#dcb67a' : '#c09553'} stroke="none">
            <path d={FOLDER_ICON_PATH} />
          </svg>
        ) : (
          <span class="tree-node-file-icon" style={{ color: getExtColor(props.entry.extension) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
              <path d="M14 2V8H20" />
            </svg>
          </span>
        )}

        <span class="tree-node-name truncate">{props.entry.name}</span>
      </div>

      <Show when={expanded() && props.entry.isDir}>
        <div class="tree-node-children">
          <Show when={loading()}>
            <div class="tree-node-loading" style={{ "padding-left": `${((props.depth || 0) + 1) * 16 + 8}px` }}>
              Loading...
            </div>
          </Show>
          <Show when={!loading()}>
            <For each={children()}>
              {(child) => (
                <TreeNode
                  entry={child}
                  depth={(props.depth || 0) + 1}
                  onFileClick={props.onFileClick}
                  onRefreshDir={props.onRefreshDir}
                />
              )}
            </For>
            <Show when={children().length === 0}>
              <div class="tree-node-empty" style={{ "padding-left": `${((props.depth || 0) + 1) * 16 + 8}px` }}>
                (empty)
              </div>
            </Show>
          </Show>
        </div>
      </Show>

      <Show when={contextMenu()}>
        <div class="context-menu-overlay" onClick={closeContextMenu} />
        <div class="context-menu" style={{ left: `${contextMenu().x}px`, top: `${contextMenu().y}px` }}>
          <div class="context-menu-item" onClick={() => handleContextAction('newFile')}>New File</div>
          <div class="context-menu-item" onClick={() => handleContextAction('newFolder')}>New Folder</div>
          <div class="context-menu-separator" />
          <div class="context-menu-item" onClick={() => handleContextAction('rename')}>Rename</div>
          <div class="context-menu-item danger" onClick={() => handleContextAction('delete')}>Delete</div>
        </div>
      </Show>
    </>
  );
}
