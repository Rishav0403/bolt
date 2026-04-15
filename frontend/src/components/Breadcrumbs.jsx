import { createSignal, createEffect, Show, For } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Breadcrumbs – shows the file-path segments for the active editor tab.
 *
 * Controlled by `settings().breadcrumbsEnabled`.
 * Parses `activeTab().path` into clickable path segments.
 *
 * EditorPane can call `Breadcrumbs.setEditorInstance(editor)` to enable
 * cursor-position-aware symbol display in the future.
 */

// Module-level editor reference for future symbol detection
let _editorInstance = null;

export default function Breadcrumbs() {
  const { activeTab } = useEditor();
  const { settings } = useSettings();

  const [pathSegments, setPathSegments] = createSignal([]);
  const [currentSymbol, setCurrentSymbol] = createSignal('');

  // Parse the active tab's file path into breadcrumb segments
  createEffect(() => {
    const tab = activeTab();
    if (!tab || !tab.path) {
      setPathSegments([]);
      setCurrentSymbol('');
      return;
    }

    const filePath = tab.path;
    // Normalise separators (handle both / and \)
    const normalised = filePath.replace(/\\/g, '/');
    const parts = normalised.split('/').filter(Boolean);

    const segments = parts.map((label, idx) => ({
      label,
      fullPath: parts.slice(0, idx + 1).join('/'),
    }));

    setPathSegments(segments);
    setCurrentSymbol('');
  });

  return (
    <Show when={settings().breadcrumbsEnabled}>
      <div class="breadcrumbs-bar">
        <Show when={activeTab()} fallback={<span class="breadcrumb-empty">No file open</span>}>
          <For each={pathSegments()}>
            {(segment, index) => (
              <>
                <Show when={index() > 0}>
                  <span class="breadcrumb-separator">›</span>
                </Show>
                <span
                  class="breadcrumb-segment"
                  classList={{ 'breadcrumb-file': index() === pathSegments().length - 1 }}
                  title={segment.fullPath}
                >
                  {segment.label}
                </span>
              </>
            )}
          </For>
          <Show when={currentSymbol()}>
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-symbol">{currentSymbol()}</span>
          </Show>
        </Show>
      </div>
    </Show>
  );
}

/**
 * Allow EditorPane to hand us the Monaco editor instance so we can
 * (in the future) listen to cursor changes and resolve symbols.
 */
Breadcrumbs.setEditorInstance = (editor) => {
  _editorInstance = editor;
};
