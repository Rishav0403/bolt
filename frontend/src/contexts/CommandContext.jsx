import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CommandContext = createContext(null);

export function CommandProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState([]);

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
    const cmd = commands.find(c => c.id === id);
    if (cmd?.handler) {
      cmd.handler();
    }
    setIsOpen(false);
  }, [commands]);

  const togglePalette = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut: Ctrl+Shift+P / Cmd+Shift+P
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        togglePalette();
      }
      if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePalette, closePalette, isOpen]);

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
