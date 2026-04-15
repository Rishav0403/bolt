import { createContext, useContext, createSignal, createEffect } from 'solid-js';
import { getWailsSettings } from '../utils/wails';

const SettingsContext = createContext();

// Hardcoded defaults matching backend/settings/service.go DefaultSettings()
const DEFAULT_SETTINGS = {
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

export function SettingsProvider(props) {
  const [settings, setSettings] = createSignal({ ...DEFAULT_SETTINGS });
  const [schema, setSchema] = createSignal([]);

  // Fetch settings from backend when rootPath changes
  createEffect(() => {
    const rootPath = props.rootPath?.() || '';
    const svc = getWailsSettings();
    if (svc) {
      svc.GetMergedSettings(rootPath).then(merged => {
        if (merged) setSettings(merged);
      }).catch(err => console.error('Failed to load settings:', err));

      svc.GetSettingsSchema().then(s => {
        if (s) setSchema(s);
      }).catch(err => console.error('Failed to load schema:', err));
    }
    // In demo mode, use defaults (already set)
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
    DEFAULT_SETTINGS,
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
