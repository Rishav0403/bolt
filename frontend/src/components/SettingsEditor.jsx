import { createSignal, createMemo, Show, For } from 'solid-js';
import { useSettings } from '../contexts/SettingsContext';
import '../settings-styles.css';

function renderControl(descriptor, settings, onUpdate) {
  const currentValue = () => settings()[descriptor.key];

  switch (descriptor.type) {
    case 'bool':
      return (
        <input
          type="checkbox"
          checked={currentValue()}
          onChange={e => onUpdate(descriptor.key, e.target.checked)}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={currentValue()}
          onChange={e => onUpdate(descriptor.key, parseFloat(e.target.value))}
        />
      );

    case 'string':
      if (descriptor.enum && descriptor.enum.length > 0) {
        return (
          <select
            value={currentValue() || ''}
            onChange={e => onUpdate(descriptor.key, e.target.value)}
          >
            <For each={descriptor.enum}>
              {(option) => <option value={option}>{option}</option>}
            </For>
          </select>
        );
      }
      return (
        <input
          type="text"
          value={currentValue() || ''}
          onChange={e => onUpdate(descriptor.key, e.target.value)}
        />
      );

    case 'array':
      return (
        <input
          type="text"
          value={currentValue()?.join(', ') || ''}
          onChange={e => onUpdate(
            descriptor.key,
            e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          )}
        />
      );

    default:
      return (
        <input
          type="text"
          value={typeof currentValue() === 'object' ? JSON.stringify(currentValue()) : (currentValue() || '')}
          onChange={e => onUpdate(descriptor.key, e.target.value)}
        />
      );
  }
}

export default function SettingsEditor(props) {
  const { settings, schema, updateSetting, saveWorkspaceSettings, rootPath } = useSettings();
  const [filter, setFilter] = createSignal('');
  const [activeScope, setActiveScope] = createSignal('user');

  const filteredSchema = createMemo(() => {
    const f = filter().toLowerCase();
    if (!f) return schema();
    return schema().filter(descriptor =>
      (descriptor.key && descriptor.key.toLowerCase().includes(f)) ||
      (descriptor.description && descriptor.description.toLowerCase().includes(f))
    );
  });

  // Route setting updates through the correct scope
  function handleUpdate(key, value) {
    if (activeScope() === 'workspace') {
      const rp = rootPath();
      if (rp) {
        // Build a partial settings object with just this key changed
        const current = settings();
        const updated = { ...current, [key]: value };
        saveWorkspaceSettings(rp, updated);
      } else {
        // No workspace open — fall back to user settings
        updateSetting(key, value);
      }
    } else {
      updateSetting(key, value);
    }
  }

  return (
    <div class="settings-editor">
      {/* Scope tabs */}
      <div class="settings-scope-tabs">
        <button
          classList={{ active: activeScope() === 'user' }}
          onClick={() => setActiveScope('user')}
        >
          User
        </button>
        <button
          classList={{ active: activeScope() === 'workspace' }}
          onClick={() => setActiveScope('workspace')}
        >
          Workspace
        </button>
      </div>

      {/* Search input */}
      <div class="settings-search">
        <input
          placeholder="Search settings..."
          value={filter()}
          onInput={e => setFilter(e.target.value)}
        />
      </div>

      {/* Settings list */}
      <div class="settings-list">
        <For each={filteredSchema()}>
          {(descriptor) => (
            <div class="settings-item">
              <div class="settings-item-header">
                <span class="settings-item-key">{descriptor.key}</span>
                <span class="settings-item-type">{descriptor.type}</span>
              </div>
              <p class="settings-item-description">{descriptor.description}</p>
              <div class="settings-item-control">
                {renderControl(descriptor, settings, handleUpdate)}
                <span class="settings-item-default">
                  Default: {JSON.stringify(descriptor.default)}
                </span>
              </div>
            </div>
          )}
        </For>
        <Show when={filteredSchema().length === 0}>
          <div class="settings-empty">No settings match your search</div>
        </Show>
      </div>
    </div>
  );
}
