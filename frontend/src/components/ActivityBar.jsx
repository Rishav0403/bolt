import React from 'react';

const icons = {
  explorer: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
    </svg>
  ),
  search: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16L21 21" />
    </svg>
  ),
  git: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M12 8V16" />
      <path d="M12 8C12 10 14 12 16 12" />
    </svg>
  ),
  extensions: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" />
    </svg>
  ),
};

export default function ActivityBar({ activeView, onViewChange }) {
  const topItems = [
    { id: 'explorer', icon: icons.explorer, title: 'Explorer (Ctrl+Shift+E)' },
    { id: 'search', icon: icons.search, title: 'Search (Ctrl+Shift+F)' },
    { id: 'git', icon: icons.git, title: 'Source Control (Ctrl+Shift+G)' },
    { id: 'extensions', icon: icons.extensions, title: 'Extensions (Ctrl+Shift+X)' },
  ];

  const bottomItems = [
    { id: 'settings', icon: icons.settings, title: 'Settings' },
  ];

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {topItems.map(item => (
          <button
            key={item.id}
            className={`activity-bar-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(activeView === item.id ? null : item.id)}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="activity-bar-bottom">
        {bottomItems.map(item => (
          <button
            key={item.id}
            className={`activity-bar-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <style>{`
        .activity-bar {
          width: var(--activity-bar-width);
          height: 100%;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--border);
          flex-shrink: 0;
        }

        .activity-bar-top,
        .activity-bar-bottom {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .activity-bar-item {
          width: var(--activity-bar-width);
          height: var(--activity-bar-width);
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          transition: color 0.1s;
        }

        .activity-bar-item:hover {
          color: var(--text-primary);
        }

        .activity-bar-item.active {
          color: var(--text-bright);
        }

        .activity-bar-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--text-bright);
        }
      `}</style>
    </div>
  );
}
