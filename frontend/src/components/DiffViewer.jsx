import { onMount, onCleanup, createEffect } from 'solid-js';
import * as monaco from 'monaco-editor';

/**
 * DiffViewer renders a Monaco diff editor showing original vs modified content.
 * Props:
 *   - originalContent: string — the original file content (e.g., from HEAD)
 *   - modifiedContent: string — the modified file content
 *   - originalLabel: string — label for the original side (e.g., "HEAD")
 *   - modifiedLabel: string — label for the modified side (e.g., "Working Tree")
 *   - language: string — Monaco language ID
 *   - onClose: function — callback to close the diff viewer
 */
export default function DiffViewer(props) {
  let containerRef;
  let diffEditor = null;

  onMount(() => {
    diffEditor = monaco.editor.createDiffEditor(containerRef, {
      theme: 'vs-dark',
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 8 },
    });

    updateModels();
  });

  function updateModels() {
    if (!diffEditor) return;
    const original = props.originalContent || '';
    const modified = props.modifiedContent || '';
    const lang = props.language || 'plaintext';

    const originalModel = monaco.editor.createModel(original, lang);
    const modifiedModel = monaco.editor.createModel(modified, lang);

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });
  }

  // Update when content changes
  createEffect(() => {
    const _o = props.originalContent;
    const _m = props.modifiedContent;
    const _l = props.language;
    if (diffEditor) {
      // Dispose old models
      const model = diffEditor.getModel();
      if (model) {
        model.original?.dispose();
        model.modified?.dispose();
      }
      updateModels();
    }
  });

  onCleanup(() => {
    if (diffEditor) {
      const model = diffEditor.getModel();
      if (model) {
        model.original?.dispose();
        model.modified?.dispose();
      }
      diffEditor.dispose();
      diffEditor = null;
    }
  });

  return (
    <div class="diff-viewer">
      <div class="diff-viewer-header">
        <div class="diff-viewer-labels">
          <span class="diff-viewer-label original">{props.originalLabel || 'Original'}</span>
          <span class="diff-viewer-label modified">{props.modifiedLabel || 'Modified'}</span>
        </div>
        <button
          class="diff-viewer-close"
          onClick={() => props.onClose?.()}
          title="Close Diff"
        >
          ×
        </button>
      </div>
      <div ref={containerRef} class="diff-viewer-container" />
    </div>
  );
}
