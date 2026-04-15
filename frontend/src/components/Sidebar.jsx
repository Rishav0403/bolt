import React from 'react';
import FileExplorer from './FileExplorer';

// Reusable placeholder for coming-soon sidebar views
function PlaceholderView({ icon, title, hint }) {
  return (
    <div className="sidebar-placeholder">
      {icon && <div className="sidebar-placeholder-icon">{icon}</div>}
      <p>{title}</p>
      <p className="sidebar-placeholder-hint">{hint}</p>
    </div>
  );
}

// SVG icons for placeholder views
const placeholderIcons = {
  search: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
      <circle cx="11" cy="11" r="7" />
      <path d="M16 16L21 21" />
    </svg>
  ),
  git: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M12 8V16" />
      <path d="M12 8C12 10 14 12 16 12" />
    </svg>
  ),
  extensions: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </svg>
  ),
};

export default function Sidebar({ activeView, rootPath }) {
  if (!activeView) return null;

  const renderContent = () => {
    switch (activeView) {
      case 'explorer':
        return <FileExplorer rootPath={rootPath} />;
      case 'search':
        return <PlaceholderView icon={placeholderIcons.search} title="Search" hint="Coming in Phase 2" />;
      case 'git':
        return <PlaceholderView icon={placeholderIcons.git} title="Source Control" hint="Coming in Phase 4" />;
      case 'extensions':
        return <PlaceholderView icon={placeholderIcons.extensions} title="Extensions" hint="Coming in Phase 5" />;
      case 'settings':
        return <PlaceholderView title="Settings" hint="Coming soon" />;
      default:
        return null;
    }
  };

  const titles = {
    explorer: 'EXPLORER',
    search: 'SEARCH',
    git: 'SOURCE CONTROL',
    extensions: 'EXTENSIONS',
    settings: 'SETTINGS',
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{titles[activeView] || ''}</span>
      </div>
      <div className="sidebar-content">
        {renderContent()}
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100%;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar-header {
          height: 35px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          flex-shrink: 0;
        }

        .sidebar-title {
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.8px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-muted);
          font-size: 13px;
          gap: 8px;
        }

        .sidebar-placeholder-icon {
          margin-bottom: 8px;
        }

        .sidebar-placeholder-hint {
          font-size: 11px;
          color: var(--text-muted);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
