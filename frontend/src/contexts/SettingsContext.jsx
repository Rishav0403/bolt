import { createContext, useContext, createSignal, createEffect } from 'solid-js';
import { getWailsSettings } from '../utils/wails';

const SettingsContext = createContext();

// Fallback defaults used in demo mode (no backend) or before schema loads.
// When the backend is available, these are replaced with values from GetSettingsSchema().
const FALLBACK_DEFAULTS = {
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  tabSize: 4,
  wordWrap: 'off',
  minimap: true,
  terminalShell: '',
  terminalFontSize: 13,
  terminalFontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  searchExcludeGlobs: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  breadcrumbsEnabled: true,
  stickyScrollEnabled: true,
  stickyScrollMaxLines: 5,
};

/**
 * Derive a defaults object from the schema descriptors returned by the backend.
 * Each descriptor contains a `default` field — we build a key→value map from it.
 */
function defaultsFromSchema(schemaDescriptors) {
  const defaults = {};
  for (const d of schemaDescriptors) {
    defaults[d.key] = d.default;
  }
  return defaults;
}

export function SettingsProvider(props) {
  const [settings, setSettings] = createSignal({ ...FALLBACK_DEFAULTS });
  const [schema, setSchema] = createSignal([]);
  const [defaults, setDefaults] = createSignal({ ...FALLBACK_DEFAULTS });

  // Fetch settings from backend when rootPath changes
  createEffect(() => {
    const rootPath = props.rootPath?.() || '';
    const svc = getWailsSettings();
    if (svc) {
      svc.GetMergedSettings(rootPath).then(merged => {
        if (merged) setSettings(merged);
      }).catch(err => console.error('Failed to load settings:', err));

      svc.GetSettingsSchema().then(s => {
        if (s) {
          setSchema(s);
          // Derive defaults from the backend schema — single source of truth.
          setDefaults(defaultsFromSchema(s));
        }
      }).catch(err => console.error('Failed to load schema:', err));
    }
    // In demo mode, use fallback defaults (already set)
  });

  async function updateSetting(key, value) {
    const svc = getWailsSettings();
    if (svc) {
      try {
        await svc.UpdateSetting(key, value);
        // Re-fetch merged settings to get the updated state
        const rootPath = props.rootPath?.() || '';
        const merged = await svc.GetMergedSettings(rootPath);
        if (merged) setSettings(merged);
      } catch (err) {
        console.error('Failed to update setting:', err);
      }
    } else {
      // Demo mode: update local state
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  }

  async function saveWorkspaceSettings(rootPath, wsSettings) {
    const svc = getWailsSettings();
    if (svc && rootPath) {
      try {
        await svc.SaveWorkspaceSettings(rootPath, wsSettings);
        const merged = await svc.GetMergedSettings(rootPath);
        if (merged) setSettings(merged);
      } catch (err) {
        console.error('Failed to save workspace settings:', err);
      }
    }
  }

  const rootPathAccessor = () => props.rootPath?.() || '';

  const value = {
    settings,
    schema,
    updateSetting,
    saveWorkspaceSettings,
    rootPath: rootPathAccessor,
    defaults,
  };

  return (
    <SettingsContext.Provider value={value}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
