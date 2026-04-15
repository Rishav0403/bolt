import React from 'react';
import { useEditor } from '../contexts/EditorContext';

export default function StatusBar() {
  const { activeTab } = useEditor();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-bar-item clickable" title="Source Control">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M12 8V16" />
          </svg>
          <span>main</span>
        </span>
      </div>
      <div className="status-bar-right">
        {activeTab && (
          <>
            <span className="status-bar-item">Ln 1, Col 1</span>
            <span className="status-bar-item">{activeTab.language || 'Plain Text'}</span>
            <span className="status-bar-item">UTF-8</span>
          </>
        )}
        <span className="status-bar-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
          Bolt
        </span>
      </div>

      <style>{`
        .status-bar {
          height: var(--statusbar-height);
          background: var(--statusbar-bg);
          color: var(--statusbar-text);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          font-size: 12px;
          flex-shrink: 0;
          user-select: none;
        }

        .status-bar-left,
        .status-bar-right {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .status-bar-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 6px;
          height: var(--statusbar-height);
          line-height: var(--statusbar-height);
          white-space: nowrap;
        }

        .status-bar-item.clickable {
          cursor: pointer;
          border-radius: 3px;
        }

        .status-bar-item.clickable:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .status-bar-item svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
