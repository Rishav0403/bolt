import React from 'react';
import { useEditor } from '../contexts/EditorContext';
import { getFileIcon } from '../utils/fileIcons';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useEditor();

  if (tabs.length === 0) return null;

  const handleClose = (e, id) => {
    e.stopPropagation();
    closeTab(id);
  };

  return (
    <div className="tab-bar">
      <div className="tab-bar-scroll">
        {tabs.map(tab => {
          const icon = getFileIcon(tab.name);
          return (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.path}
            >
              <span className="tab-icon" style={{ color: icon.color }}>
                {icon.label}
              </span>
              <span className="tab-name truncate">{tab.name}</span>
              {tab.isModified && <span className="tab-modified" />}
              <button
                className="tab-close"
                onClick={(e) => handleClose(e, tab.id)}
                title="Close"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .tab-bar {
          height: var(--tabbar-height);
          background: var(--tab-border);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          flex-shrink: 0;
        }

        .tab-bar-scroll {
          display: flex;
          overflow-x: auto;
          overflow-y: hidden;
          height: 100%;
          align-items: flex-end;
        }

        .tab-bar-scroll::-webkit-scrollbar {
          height: 3px;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 100%;
          padding: 0 12px;
          background: var(--tab-inactive-bg);
          border-right: 1px solid var(--tab-border);
          cursor: pointer;
          min-width: 120px;
          max-width: 200px;
          font-size: 13px;
          color: var(--text-secondary);
          user-select: none;
          position: relative;
          flex-shrink: 0;
        }

        .tab:hover {
          background: var(--bg-hover);
        }

        .tab.active {
          background: var(--tab-active-bg);
          color: var(--text-bright);
        }

        .tab.active::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--accent);
        }

        .tab-icon {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-mono);
          flex-shrink: 0;
        }

        .tab-name {
          flex: 1;
          min-width: 0;
        }

        .tab-modified {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-primary);
          flex-shrink: 0;
        }

        .tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: none;
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 3px;
          flex-shrink: 0;
          opacity: 0;
          transition: opacity 0.1s;
        }

        .tab:hover .tab-close,
        .tab.active .tab-close {
          opacity: 1;
        }

        .tab-close:hover {
          background: var(--bg-active);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
