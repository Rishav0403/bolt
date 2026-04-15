import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const CommandContext = createContext(null);

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
    // The last non-modifier part is the key
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

export function CommandProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState([]);
  // Keep a ref for commands so the keydown handler always sees the latest list
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const registerCommand = useCallback((command) => {
    setCommands(prev => {
      if (prev.find(c => c.id === command.id)) return prev;
      return [...prev, command];
    });
  }, []);

  const registerCommands = useCallback((cmds) => {
    setCommands(prev => {
      const existing = new Set(prev.map(c => c.id));
      const newCmds = cmds.filter(c => !existing.has(c.id));
      return [...prev, ...newCmds];
    });
  }, []);

  const executeCommand = useCallback((id) => {
    const cmd = commandsRef.current.find(c => c.id === id);
    if (cmd?.handler) {
      cmd.handler();
    }
    setIsOpen(false);
  }, []);

  const togglePalette = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut dispatcher — matches registered command keybindings
  useEffect(() => {
    const handler = (e) => {
      // Escape always closes the palette
      if (e.key === 'Escape') {
        setIsOpen(prev => {
          if (prev) {
            e.preventDefault();
            return false;
          }
          return prev;
        });
        return;
      }

      // Try to match against all registered command keybindings
      for (const cmd of commandsRef.current) {
        if (!cmd.keybinding) continue;
        const binding = parseKeybinding(cmd.keybinding);
        if (matchesKeybinding(e, binding)) {
          e.preventDefault();
          cmd.handler();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <CommandContext.Provider value={{
      isOpen,
      commands,
      registerCommand,
      registerCommands,
      executeCommand,
      openPalette,
      closePalette,
      togglePalette,
    }}>
      {children}
    </CommandContext.Provider>
  );
}

export function useCommands() {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommands must be used within CommandProvider');
  return ctx;
}

export default CommandContext;
