import { createContext, useContext, createSignal, onMount, onCleanup } from 'solid-js';

const CommandContext = createContext();

/**
 * Parse a keybinding string like "Ctrl+Shift+P" into a descriptor
 * that can be matched against a KeyboardEvent.
 */
function parseKeybinding(kb) {
  if (!kb) return null;
  const parts = kb.split('+').map(p => p.trim().toLowerCase());
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.filter(p => !['ctrl', 'shift', 'alt'].includes(p)).pop() || '',
  };
}

/**
 * Check whether a keyboard event matches a parsed keybinding descriptor.
 */
function matchesKeybinding(e, binding) {
  if (!binding) return false;
  const ctrlOrMeta = e.ctrlKey || e.metaKey;
  if (binding.ctrl !== ctrlOrMeta) return false;
  if (binding.shift !== e.shiftKey) return false;
  if (binding.alt !== e.altKey) return false;
  return e.key.toLowerCase() === binding.key;
}

export function CommandProvider(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [commands, setCommands] = createSignal([]);

  function registerCommands(cmds) {
    setCommands(prev => {
      const existing = new Set(prev.map(c => c.id));
      const newCmds = cmds
        .filter(c => !existing.has(c.id))
        .map(c => ({
          ...c,
          // Parse keybinding once at registration time so the keydown
          // hot path only needs to compare, not parse strings.
          parsedBinding: parseKeybinding(c.keybinding),
        }));
      if (newCmds.length === 0) return prev;
      return [...prev, ...newCmds];
    });
  }

  function executeCommand(id) {
    const cmd = commands().find(c => c.id === id);
    if (cmd?.handler) {
      cmd.handler();
    }
    setIsOpen(false);
  }

  const openPalette = () => setIsOpen(true);
  const closePalette = () => setIsOpen(false);

  // Global keyboard shortcut dispatcher
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (isOpen()) {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    for (const cmd of commands()) {
      if (!cmd.parsedBinding) continue;
      if (matchesKeybinding(e, cmd.parsedBinding)) {
        e.preventDefault();
        cmd.handler();
        return;
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  const value = {
    isOpen,
    commands,
    registerCommands,
    executeCommand,
    openPalette,
    closePalette,
  };

  return (
    <CommandContext.Provider value={value}>
      {props.children}
    </CommandContext.Provider>
  );
}

export function useCommands() {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommands must be used within CommandProvider');
  return ctx;
}
