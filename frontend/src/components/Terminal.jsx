import { onMount, onCleanup } from 'solid-js';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { getWailsTerminal } from '../utils/wails';
import 'xterm/css/xterm.css';

/**
 * Base64-encode a string safely (handles multi-byte / non-Latin1 chars).
 */
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Decode base64 terminal output (may contain binary ANSI escape sequences).
 */
function decodeBase64(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Terminal(props) {
  let containerRef;
  let term;
  let fitAddon;
  let resizeObserver;
  let cleanupFns = [];

  onMount(() => {
    // 1. Create xterm instance
    term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
    });

    // 2. Create and load FitAddon
    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // 3. Open xterm on the container div
    term.open(containerRef);

    // 4. Try loading WebglAddon (may not be available)
    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn('WebGL addon not available, using canvas renderer:', e);
    }

    // 5. Fit to container
    fitAddon.fit();

    const svc = getWailsTerminal();

    if (!svc) {
      // Demo mode — no Wails backend available
      term.write('\x1b[33mTerminal requires the Bolt desktop app.\r\nRun: wails dev\r\n\x1b[0m');
    } else {
      // 6. Spawn the backend PTY
      svc.CreateTerminal(props.id);

      // 7. Forward user input to backend (base64 encoded)
      const onDataDisposable = term.onData((data) => {
        const encoded = encodeBase64(data);
        svc.WriteTerminal(props.id, encoded);
      });
      cleanupFns.push(() => onDataDisposable.dispose());

      // 8. Listen for backend output
      const outputEvent = `terminal:output:${props.id}`;
      if (window.runtime?.EventsOn) {
        window.runtime.EventsOn(outputEvent, (b64Data) => {
          const decoded = decodeBase64(b64Data);
          term.write(decoded);
        });
        cleanupFns.push(() => {
          window.runtime?.EventsOff?.(outputEvent);
        });
      }

      // 9. Listen for process exit
      const exitEvent = `terminal:exit:${props.id}`;
      if (window.runtime?.EventsOn) {
        window.runtime.EventsOn(exitEvent, () => {
          term.write('\r\n[Process exited]\r\n');
        });
        cleanupFns.push(() => {
          window.runtime?.EventsOff?.(exitEvent);
        });
      }
    }

    // 10. ResizeObserver for auto-fitting
    resizeObserver = new ResizeObserver(() => {
      if (fitAddon && containerRef.offsetWidth > 0 && containerRef.offsetHeight > 0) {
        fitAddon.fit();
        if (svc) {
          svc.ResizeTerminal(props.id, term.cols, term.rows);
        }
      }
    });
    resizeObserver.observe(containerRef);
  });

  onCleanup(() => {
    // Dispose all event listeners
    cleanupFns.forEach(fn => fn());
    cleanupFns = [];

    // Disconnect resize observer
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    // Close the backend terminal
    const svc = getWailsTerminal();
    if (svc) {
      svc.CloseTerminal(props.id);
    }

    // Dispose xterm
    if (term) {
      term.dispose();
      term = null;
    }
  });

  return (
    <div
      ref={containerRef}
      class="terminal-instance"
      style={{ display: props.active ? 'block' : 'none' }}
    />
  );
}
