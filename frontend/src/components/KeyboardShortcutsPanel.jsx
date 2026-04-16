import { createSignal, createMemo, For, Show } from 'solid-js';
import { useCommands } from '../contexts/CommandContext';

/**
 * Categorize a command based on its id.
 */
function getCategory(id) {
  if (['saveFile', 'closeTab', 'goToLine', 'splitEditor'].includes(id)) return 'Editor';
  if (['openFolder', 'quickOpen'].includes(id)) return 'File';
  if (['showGit'].includes(id)) return 'Git';
  if (['toggleTerminal', 'newTerminal'].includes(id)) return 'Terminal';
  if (['commandPalette', 'toggleSidebar', 'showExplorer', 'showSearch', 'showExtensions', 'keyboardShortcuts'].includes(id)) return 'Navigation';
  return 'General';
}

const CATEGORY_ORDER = ['File', 'Editor', 'Navigation', 'Git', 'Terminal', 'General'];

export default function KeyboardShortcutsPanel(props) {
  const { commands } = useCommands();
  const [searchQuery, setSearchQuery] = createSignal('');

  const filteredCommands = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    let cmds = commands().filter(c => c.keybinding); // only show commands with keybindings

    if (q) {
      cmds = cmds.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.keybinding.toLowerCase().includes(q) ||
        getCategory(c.id).toLowerCase().includes(q)
      );
    }

    // Group by category
    const groups = {};
    for (const cmd of cmds) {
      const cat = getCategory(cmd.id);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    }

    // Sort by category order
    const sorted = [];
    for (const cat of CATEGORY_ORDER) {
      if (groups[cat]) {
        sorted.push({ category: cat, commands: groups[cat] });
      }
    }
    return sorted;
  });

  return (
    <div class="shortcuts-panel">
      <div class="shortcuts-header">
        <h2 class="shortcuts-title">Keyboard Shortcuts</h2>
        <button
          class="shortcuts-close"
          onClick={() => props.onClose?.()}
          title="Close"
        >
          ×
        </button>
      </div>
      <div class="shortcuts-search">
        <input
          type="text"
          class="shortcuts-search-input"
          placeholder="Search shortcuts..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
        />
      </div>
      <div class="shortcuts-content">
        <For each={filteredCommands()}>
          {(group) => (
            <div class="shortcuts-category">
              <h3 class="shortcuts-category-title">{group.category}</h3>
              <div class="shortcuts-table">
                <For each={group.commands}>
                  {(cmd) => (
                    <div class="shortcuts-row">
                      <span class="shortcuts-command-name">{cmd.label}</span>
                      <span class="shortcuts-keybinding">
                        <For each={cmd.keybinding.split('+')}>
                          {(key) => <kbd class="shortcuts-kbd">{key.trim()}</kbd>}
                        </For>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <Show when={filteredCommands().length === 0}>
          <div class="shortcuts-empty">No matching shortcuts found</div>
        </Show>
      </div>
    </div>
  );
}
