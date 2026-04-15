import { createSignal, createMemo, createEffect, Show, For } from 'solid-js';
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
      if (lastMatchIdx === ti - 1) score += 5;
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
  const [query, setQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef;
  let listRef;

  // Filter and sort commands by fuzzy match
  const filteredCommands = createMemo(() => {
    return commands()
      .map(cmd => ({
        ...cmd,
        ...fuzzyMatch(query(), cmd.label),
      }))
      .filter(cmd => cmd.match)
      .sort((a, b) => b.score - a.score);
  });

  // Reset state when opened, focus input
  createEffect(() => {
    if (isOpen()) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  // Keep selected index in bounds
  createEffect(() => {
    const len = filteredCommands().length;
    if (selectedIndex() >= len) {
      setSelectedIndex(Math.max(0, len - 1));
    }
  });

  // Scroll selected item into view
  createEffect(() => {
    const idx = selectedIndex();
    if (listRef) {
      const selected = listRef.children[idx];
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands().length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands()[selectedIndex()]) {
          executeCommand(filteredCommands()[selectedIndex()].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
    }
  }

  return (
    <Show when={isOpen()}>
      <div class="command-palette-overlay" onClick={closePalette} />
      <div class="command-palette">
        <div class="command-palette-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="command-palette-search-icon">
            <circle cx="11" cy="11" r="7" />
            <path d="M16 16L21 21" />
          </svg>
          <input
            ref={inputRef}
            class="command-palette-input"
            type="text"
            placeholder="Type a command..."
            value={query()}
            onInput={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div class="command-palette-list" ref={listRef}>
          <For each={filteredCommands()}>
            {(cmd, idx) => (
              <div
                class={`command-palette-item ${idx() === selectedIndex() ? 'selected' : ''}`}
                onClick={() => executeCommand(cmd.id)}
                onMouseEnter={() => setSelectedIndex(idx())}
              >
                <span class="command-palette-item-label">{cmd.label}</span>
                <Show when={cmd.keybinding}>
                  <span class="command-palette-item-keybinding">
                    {cmd.keybinding}
                  </span>
                </Show>
              </div>
            )}
          </For>
          <Show when={filteredCommands().length === 0}>
            <div class="command-palette-empty">
              No matching commands
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
