import React, { useState, useCallback } from 'react';
import { isWailsEnv, getWailsFs } from '../utils/wails';
import { getExtColor } from '../utils/fileIcons';
import { parentDir, joinPath } from '../utils/pathUtils';

// Folder icon SVG path (same shape for expanded and collapsed)
const FOLDER_ICON_PATH = "M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z";

export default function TreeNode({ entry, depth = 0, onFileClick, onRefreshDir }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState(entry.children || []);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const toggleExpand = useCallback(async () => {
    if (!entry.isDir) return;

    const fs = getWailsFs();
    if (!expanded && fs) {
      setLoading(true);
      try {
        const result = await fs.ListDir(entry.path);
        setChildren(result || []);
      } catch (err) {
        console.error('Failed to list dir:', err);
      }
      setLoading(false);
    }
    setExpanded(prev => !prev);
  }, [entry, expanded]);

  const handleClick = useCallback(() => {
    if (entry.isDir) {
      toggleExpand();
    } else {
      onFileClick?.(entry);
    }
  }, [entry, toggleExpand, onFileClick]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback(async (action) => {
    closeContextMenu();
    const fs = getWailsFs();
    if (!fs) return;

    try {
      switch (action) {
        case 'newFile': {
          const name = prompt('File name:');
          if (!name) return;
          const dir = entry.isDir ? entry.path : parentDir(entry.path);
          await fs.CreateFile(joinPath(dir, name));
          onRefreshDir?.();
          break;
        }
        case 'newFolder': {
          const name = prompt('Folder name:');
          if (!name) return;
          const dir = entry.isDir ? entry.path : parentDir(entry.path);
          await fs.CreateDir(joinPath(dir, name));
          onRefreshDir?.();
          break;
        }
        case 'rename': {
          const newName = prompt('New name:', entry.name);
          if (!newName || newName === entry.name) return;
          const dir = parentDir(entry.path);
          await fs.RenamePath(entry.path, joinPath(dir, newName));
          onRefreshDir?.();
          break;
        }
        case 'delete': {
          if (confirm(`Delete "${entry.name}"?`)) {
            await fs.DeletePath(entry.path);
            onRefreshDir?.();
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  }, [entry, onRefreshDir, closeContextMenu]);

  return (
    <>
      <div
        className="tree-node"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="tree-node-arrow">
          {entry.isDir ? (
            <svg
              width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}
            >
              <path d="M6 4l4 4-4 4V4z" />
            </svg>
          ) : (
            <span style={{ width: 12 }} />
          )}
        </span>

        {entry.isDir ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={expanded ? '#dcb67a' : '#c09553'} stroke="none">
            <path d={FOLDER_ICON_PATH} />
          </svg>
        ) : (
          <span className="tree-node-file-icon" style={{ color: getExtColor(entry.extension) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
              <path d="M14 2V8H20" />
            </svg>
          </span>
        )}

        <span className="tree-node-name truncate">{entry.name}</span>
      </div>

      {expanded && entry.isDir && (
        <div className="tree-node-children">
          {loading ? (
            <div className="tree-node-loading" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              Loading...
            </div>
          ) : (
            children.map(child => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileClick={onFileClick}
                onRefreshDir={onRefreshDir}
              />
            ))
          )}
          {!loading && children.length === 0 && (
            <div className="tree-node-empty" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              (empty)
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={closeContextMenu} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <div className="context-menu-item" onClick={() => handleContextAction('newFile')}>New File</div>
            <div className="context-menu-item" onClick={() => handleContextAction('newFolder')}>New Folder</div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => handleContextAction('rename')}>Rename</div>
            <div className="context-menu-item danger" onClick={() => handleContextAction('delete')}>Delete</div>
          </div>
        </>
      )}

      <style>{`
        .tree-node {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          cursor: pointer;
          user-select: none;
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .tree-node:hover {
          background: var(--bg-hover);
        }

        .tree-node-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          flex-shrink: 0;
          color: var(--text-muted);
        }

        .tree-node-file-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .tree-node-name {
          flex: 1;
          min-width: 0;
        }

        .tree-node-loading,
        .tree-node-empty {
          height: 22px;
          display: flex;
          align-items: center;
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
        }

        .context-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
        }

        .context-menu {
          position: fixed;
          z-index: 1000;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 0;
          min-width: 160px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .context-menu-item {
          padding: 4px 24px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text-primary);
        }

        .context-menu-item:hover {
          background: var(--accent);
          color: white;
        }

        .context-menu-item.danger {
          color: var(--danger);
        }

        .context-menu-item.danger:hover {
          background: var(--danger);
          color: white;
        }

        .context-menu-separator {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }
      `}</style>
    </>
  );
}
