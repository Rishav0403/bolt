import { createSignal, createEffect, Show, For } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Breadcrumbs -- shows the file-path segments for the active editor tab.
 * Controlled by `settings().breadcrumbsEnabled`.
 */
export default function Breadcrumbs() {
  const { activeTab } = useEditor();
  const { settings } = useSettings();

  const [pathSegments, setPathSegments] = createSignal([]);

  // Parse the active tab's file path into breadcrumb segments
  createEffect(() => {
    const tab = activeTab();
    if (!tab || !tab.path) {
      setPathSegments([]);
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
  });

  return (
    <Show when={settings().breadcrumbsEnabled}>
      <div class="breadcrumbs-bar">
        <Show when={activeTab()} fallback={<span class="breadcrumb-empty">No file open</span>}>
          <For each={pathSegments()}>
            {(segment, index) => (
              <>
                <Show when={index() > 0}>
                  <span class="breadcrumb-separator">{'\u203A'}</span>
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
        </Show>
      </div>
    </Show>
  );
}
