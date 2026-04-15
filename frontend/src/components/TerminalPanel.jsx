import { For, createSignal } from 'solid-js';
import { useTerminal } from '../contexts/TerminalContext';
import Terminal from './Terminal';

export default function TerminalPanel() {
  const {
    terminals,
    activeTerminalId,
    setActiveTerminalId,
    panelVisible,
    setPanelVisible,
    createTerminal,
    closeTerminal,
  } = useTerminal();

  const [panelHeight, setPanelHeight] = createSignal(250);

  // ── Drag resize handle ──────────────────────────────────
  function onResizeMouseDown(e) {
    e.preventDefault();
    const onMouseMove = (ev) => {
      const newHeight = window.innerHeight - ev.clientY;
      const clamped = Math.max(100, Math.min(newHeight, window.innerHeight * 0.7));
      setPanelHeight(clamped);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      class="terminal-panel"
      style={{
        height: `${panelHeight()}px`,
        display: panelVisible() ? 'flex' : 'none',
      }}
    >
      {/* Resize handle */}
      <div
        class="terminal-resize-handle"
        onMouseDown={onResizeMouseDown}
      />

      {/* Header with tabs */}
      <div class="terminal-panel-header">
        <span class="terminal-panel-title">Terminal</span>

        <div class="terminal-tabs">
          <For each={terminals}>
            {(t) => (
              <button
                class="terminal-tab"
                classList={{ active: activeTerminalId() === t.id }}
                onClick={() => setActiveTerminalId(t.id)}
              >
                <span>{t.title}</span>
                <span
                  class="terminal-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(t.id);
                  }}
                >
                  ×
                </span>
              </button>
            )}
          </For>
        </div>

        <div class="terminal-panel-actions">
          <button
            class="terminal-action-btn"
            title="New Terminal"
            onClick={() => createTerminal()}
          >
            +
          </button>
          <button
            class="terminal-action-btn"
            title="Close Panel"
            onClick={() => setPanelVisible(false)}
          >
            ×
          </button>
        </div>
      </div>

      {/* Terminal content area — all instances rendered, only active visible */}
      <div class="terminal-content">
        <For each={terminals}>
          {(t) => (
            <Terminal
              id={t.id}
              active={activeTerminalId() === t.id}
            />
          )}
        </For>
      </div>
    </div>
  );
}
