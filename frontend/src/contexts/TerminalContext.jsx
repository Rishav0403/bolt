import { createContext, useContext, createSignal } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

const TerminalContext = createContext();

export function TerminalProvider(props) {
  const [terminals, setTerminals] = createStore([]);
  const [activeTerminalId, setActiveTerminalId] = createSignal(null);
  const [panelVisible, setPanelVisible] = createSignal(false);

  let nextId = 1;

  function createTerminal() {
    const id = `term-${nextId++}`;
    const title = `Terminal ${nextId - 1}`;
    setTerminals(produce(prev => {
      prev.push({ id, title });
    }));
    setActiveTerminalId(id);
    if (!panelVisible()) setPanelVisible(true);
    return id;
  }

  function closeTerminal(id) {
    const idx = terminals.findIndex(t => t.id === id);
    if (idx === -1) return;
    setTerminals(produce(prev => { prev.splice(idx, 1); }));
    if (id === activeTerminalId()) {
      if (terminals.length > 0) {
        const newIdx = Math.min(idx, terminals.length - 1);
        setActiveTerminalId(terminals[newIdx]?.id || null);
      } else {
        setActiveTerminalId(null);
        setPanelVisible(false);
      }
    }
  }

  function togglePanel() {
    if (!panelVisible()) {
      setPanelVisible(true);
      if (terminals.length === 0) createTerminal();
    } else {
      setPanelVisible(false);
    }
  }

  const value = {
    terminals,
    activeTerminalId,
    setActiveTerminalId,
    panelVisible,
    setPanelVisible,
    createTerminal,
    closeTerminal,
    togglePanel,
  };

  return (
    <TerminalContext.Provider value={value}>
      {props.children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const ctx = useContext(TerminalContext);
  if (!ctx) throw new Error('useTerminal must be used within TerminalProvider');
  return ctx;
}
