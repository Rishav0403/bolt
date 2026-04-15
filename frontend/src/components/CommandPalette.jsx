import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCommands } from '../contexts/CommandContext';

// Simple fuzzy match scoring
function fuzzyMatch(query, text) {
  if (!query) return { match: true, score: 0 };

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact substring match gets highest score
  if (lowerText.includes(lowerQuery)) {
    const idx = lowerText.indexOf(lowerQuery);
    return { match: true, score: 100 - idx };
  }

  // Character-by-character fuzzy match
  let qi = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      score += 10;
      // Bonus for consecutive matches
      if (lastMatchIdx === ti - 1) score += 5;
      // Bonus for matching at word boundaries
      if (ti === 0 || lowerText[ti - 1] === ' ' || lowerText[ti - 1] === ':') score += 3;
      lastMatchIdx = ti;
      qi++;
    }
  }

  if (qi === lowerQuery.length) {
    return { match: true, score };
  }

  return { match: false, score: 0 };
}

export default function CommandPalette() {
  const { isOpen, commands, executeCommand, closePalette } = useCommands();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter and sort commands by fuzzy match
  const filteredCommands = useMemo(() => {
    return commands
      .map(cmd => ({
        ...cmd,
        ...fuzzyMatch(query, cmd.label),
      }))
      .filter(cmd => cmd.match)
      .sort((a, b) => b.score - a.score);
  }, [commands, query]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex];
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
    }
  }, [filteredCommands, selectedIndex, executeCommand, closePalette]);

  if (!isOpen) return null;

  return (
    <>
      <div className="command-palette-overlay" onClick={closePalette} />
      <div className="command-palette">
        <div className="command-palette-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="command-palette-search-icon">
            <circle cx="11" cy="11" r="7" />
            <path d="M16 16L21 21" />
          </svg>
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="command-palette-list" ref={listRef}>
          {filteredCommands.map((cmd, idx) => (
            <div
              key={cmd.id}
              className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => executeCommand(cmd.id)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="command-palette-item-label">{cmd.label}</span>
              {cmd.keybinding && (
                <span className="command-palette-item-keybinding">
                  {cmd.keybinding}
                </span>
              )}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="command-palette-empty">
              No matching commands
            </div>
          )}
        </div>
      </div>

      <style>{`
        .command-palette-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9998;
        }

        .command-palette {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          max-width: 90vw;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 6px 6px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          overflow: hidden;
        }

        .command-palette-input-wrapper {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          gap: 8px;
          border-bottom: 1px solid var(--border);
        }

        .command-palette-search-icon {
          flex-shrink: 0;
          color: var(--text-muted);
        }

        .command-palette-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 14px;
        }

        .command-palette-input::placeholder {
          color: var(--text-muted);
        }

        .command-palette-list {
          max-height: 300px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-primary);
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
          background: var(--accent);
          color: white;
        }

        .command-palette-item.selected .command-palette-item-keybinding {
          color: rgba(255, 255, 255, 0.7);
        }

        .command-palette-item-label {
          flex: 1;
        }

        .command-palette-item-keybinding {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-left: 16px;
          flex-shrink: 0;
        }

        .command-palette-empty {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }
      `}</style>
    </>
  );
}
