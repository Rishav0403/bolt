package settings

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// Settings holds the editor configuration.
type Settings struct {
	Theme               string   `json:"theme"`
	FontSize            int      `json:"fontSize"`
	FontFamily          string   `json:"fontFamily"`
	TabSize             int      `json:"tabSize"`
	WordWrap            string   `json:"wordWrap"`
	Minimap             bool     `json:"minimap"`
	TerminalShell       string   `json:"terminalShell"`
	TerminalFontSize    int      `json:"terminalFontSize"`
	TerminalFontFamily  string   `json:"terminalFontFamily"`
	SearchExcludeGlobs  []string `json:"searchExcludeGlobs"`
	BreadcrumbsEnabled  bool     `json:"breadcrumbsEnabled"`
	StickyScrollEnabled bool     `json:"stickyScrollEnabled"`
	StickyScrollMaxLines int     `json:"stickyScrollMaxLines"`
}

// SettingDescriptor describes a single setting for schema generation.
type SettingDescriptor struct {
	Key         string      `json:"key"`
	Type        string      `json:"type"`
	Default     interface{} `json:"default"`
	Description string      `json:"description"`
	Enum        []string    `json:"enum,omitempty"`
}

// DefaultSettings returns the default editor settings.
func DefaultSettings() Settings {
	return Settings{
		Theme:               "vs-dark",
		FontSize:            14,
		FontFamily:          "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
		TabSize:             4,
		WordWrap:            "off",
		Minimap:             true,
		TerminalShell:       "",
		TerminalFontSize:    13,
		TerminalFontFamily:  "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
		SearchExcludeGlobs:  []string{"**/node_modules/**", "**/.git/**", "**/dist/**"},
		BreadcrumbsEnabled:  true,
		StickyScrollEnabled: true,
		StickyScrollMaxLines: 5,
	}
}

// Service manages editor settings with persistence.
type Service struct {
	mu       sync.RWMutex
	settings Settings
	filePath string
}

// NewService creates a new settings service. Settings are loaded from disk
// or initialized with defaults.
func NewService() *Service {
	s := &Service{
		settings: DefaultSettings(),
	}
	s.filePath = s.configFilePath()
	s.load()
	return s
}

// configFilePath returns the cross-platform path to the settings file.
// Uses os.UserConfigDir which resolves to:
//   - Linux: ~/.config/bolt/settings.json
//   - macOS: ~/Library/Application Support/bolt/settings.json
//   - Windows: %APPDATA%/bolt/settings.json
func (s *Service) configFilePath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		// Fallback to home directory
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, ".config")
	}
	return filepath.Join(configDir, "bolt", "settings.json")
}

// GetSettings returns the current settings.
func (s *Service) GetSettings() Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.settings
}

// asString asserts value is a string and returns it, or an error with the setting key.
func asString(key string, value interface{}) (string, error) {
	v, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("invalid type for %q: expected string", key)
	}
	return v, nil
}

// asFloat64 asserts value is a float64 and returns it as int, or an error with the setting key.
func asInt(key string, value interface{}) (int, error) {
	v, ok := value.(float64)
	if !ok {
		return 0, fmt.Errorf("invalid type for %q: expected number", key)
	}
	return int(v), nil
}

// asBool asserts value is a bool and returns it, or an error with the setting key.
func asBool(key string, value interface{}) (bool, error) {
	v, ok := value.(bool)
	if !ok {
		return false, fmt.Errorf("invalid type for %q: expected bool", key)
	}
	return v, nil
}

// asStringSlice asserts value is a []interface{} of strings and returns []string, or an error.
func asStringSlice(key string, value interface{}) ([]string, error) {
	raw, ok := value.([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid type for %q: expected array", key)
	}
	result := make([]string, 0, len(raw))
	for _, item := range raw {
		str, ok := item.(string)
		if !ok {
			return nil, fmt.Errorf("invalid type for %q element: expected string", key)
		}
		result = append(result, str)
	}
	return result, nil
}

// UpdateSetting updates a single setting by key and persists to disk.
// Returns an error for unknown keys or values of the wrong type.
// On type error the existing value is preserved (not overwritten with a zero value).
func (s *Service) UpdateSetting(key string, value interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch key {
	case "theme":
		if v, err := asString(key, value); err != nil { return err } else { s.settings.Theme = v }
	case "fontSize":
		if v, err := asInt(key, value); err != nil { return err } else { s.settings.FontSize = v }
	case "fontFamily":
		if v, err := asString(key, value); err != nil { return err } else { s.settings.FontFamily = v }
	case "tabSize":
		if v, err := asInt(key, value); err != nil { return err } else { s.settings.TabSize = v }
	case "wordWrap":
		if v, err := asString(key, value); err != nil { return err } else { s.settings.WordWrap = v }
	case "minimap":
		if v, err := asBool(key, value); err != nil { return err } else { s.settings.Minimap = v }
	case "terminalShell":
		if v, err := asString(key, value); err != nil { return err } else { s.settings.TerminalShell = v }
	case "terminalFontSize":
		if v, err := asInt(key, value); err != nil { return err } else { s.settings.TerminalFontSize = v }
	case "terminalFontFamily":
		if v, err := asString(key, value); err != nil { return err } else { s.settings.TerminalFontFamily = v }
	case "searchExcludeGlobs":
		if v, err := asStringSlice(key, value); err != nil { return err } else { s.settings.SearchExcludeGlobs = v }
	case "breadcrumbsEnabled":
		if v, err := asBool(key, value); err != nil { return err } else { s.settings.BreadcrumbsEnabled = v }
	case "stickyScrollEnabled":
		if v, err := asBool(key, value); err != nil { return err } else { s.settings.StickyScrollEnabled = v }
	case "stickyScrollMaxLines":
		if v, err := asInt(key, value); err != nil { return err } else { s.settings.StickyScrollMaxLines = v }
	default:
		return fmt.Errorf("unknown setting key: %s", key)
	}

	return s.save()
}

// UpdateAllSettings replaces all settings and persists to disk.
func (s *Service) UpdateAllSettings(newSettings Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.settings = newSettings
	return s.save()
}

// GetSettingsSchema returns descriptors for every available setting.
func (s *Service) GetSettingsSchema() []SettingDescriptor {
	defaults := DefaultSettings()
	return []SettingDescriptor{
		{Key: "theme", Type: "string", Default: defaults.Theme, Description: "Color theme for the editor", Enum: []string{"vs-dark", "vs", "hc-black"}},
		{Key: "fontSize", Type: "number", Default: defaults.FontSize, Description: "Editor font size in pixels"},
		{Key: "fontFamily", Type: "string", Default: defaults.FontFamily, Description: "Editor font family"},
		{Key: "tabSize", Type: "number", Default: defaults.TabSize, Description: "Number of spaces per tab"},
		{Key: "wordWrap", Type: "string", Default: defaults.WordWrap, Description: "Controls word wrapping", Enum: []string{"off", "on", "wordWrapColumn", "bounded"}},
		{Key: "minimap", Type: "bool", Default: defaults.Minimap, Description: "Show the minimap"},
		{Key: "terminalShell", Type: "string", Default: defaults.TerminalShell, Description: "Terminal shell path (empty = auto-detect)"},
		{Key: "terminalFontSize", Type: "number", Default: defaults.TerminalFontSize, Description: "Terminal font size in pixels"},
		{Key: "terminalFontFamily", Type: "string", Default: defaults.TerminalFontFamily, Description: "Terminal font family"},
		{Key: "searchExcludeGlobs", Type: "array", Default: defaults.SearchExcludeGlobs, Description: "Glob patterns to exclude from search"},
		{Key: "breadcrumbsEnabled", Type: "bool", Default: defaults.BreadcrumbsEnabled, Description: "Show breadcrumb navigation"},
		{Key: "stickyScrollEnabled", Type: "bool", Default: defaults.StickyScrollEnabled, Description: "Enable sticky scroll in the editor"},
		{Key: "stickyScrollMaxLines", Type: "number", Default: defaults.StickyScrollMaxLines, Description: "Maximum number of sticky scroll lines"},
	}
}

// LoadWorkspaceSettings reads settings from the workspace .bolt/settings.json file.
// If the file doesn't exist, DefaultSettings() is returned with no error.
func (s *Service) LoadWorkspaceSettings(rootPath string) (Settings, error) {
	wsPath := filepath.Join(rootPath, ".bolt", "settings.json")
	data, err := os.ReadFile(wsPath)
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultSettings(), nil
		}
		return Settings{}, err
	}

	ws := DefaultSettings()
	if err := json.Unmarshal(data, &ws); err != nil {
		return Settings{}, fmt.Errorf("failed to parse workspace settings: %w", err)
	}
	return ws, nil
}

// GetMergedSettings returns the effective settings by merging user settings
// with workspace settings. Workspace settings override user settings for any
// fields present in the workspace settings file.
func (s *Service) GetMergedSettings(rootPath string) Settings {
	s.mu.RLock()
	merged := s.settings // copy user settings
	s.mu.RUnlock()

	if rootPath == "" {
		return merged
	}

	wsPath := filepath.Join(rootPath, ".bolt", "settings.json")
	data, err := os.ReadFile(wsPath)
	if err != nil {
		return merged // no workspace settings, return user settings
	}

	// Unmarshal workspace settings ON TOP of user settings.
	// Only fields present in the JSON will be overwritten.
	if err := json.Unmarshal(data, &merged); err != nil {
		log.Printf("warning: failed to parse workspace settings at %s: %v — using user settings", wsPath, err)
	}
	return merged
}

// SaveWorkspaceSettings writes settings to the workspace .bolt/settings.json file.
func (s *Service) SaveWorkspaceSettings(rootPath string, settings Settings) error {
	boltDir := filepath.Join(rootPath, ".bolt")
	if err := os.MkdirAll(boltDir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filepath.Join(boltDir, "settings.json"), data, 0644)
}

// load reads settings from disk. If the file doesn't exist, defaults are kept.
// If the file is corrupted, a warning is logged and defaults are used.
func (s *Service) load() {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return // Use defaults
	}
	if err := json.Unmarshal(data, &s.settings); err != nil {
		log.Printf("warning: failed to parse settings file %s: %v — using defaults", s.filePath, err)
		s.settings = DefaultSettings()
	}
}

// save writes the current settings to disk.
func (s *Service) save() error {
	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(s.settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
