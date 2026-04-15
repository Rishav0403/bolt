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
	Theme      string `json:"theme"`
	FontSize   int    `json:"fontSize"`
	FontFamily string `json:"fontFamily"`
	TabSize    int    `json:"tabSize"`
	WordWrap   string `json:"wordWrap"`
	Minimap    bool   `json:"minimap"`
}

// DefaultSettings returns the default editor settings.
func DefaultSettings() Settings {
	return Settings{
		Theme:      "vs-dark",
		FontSize:   14,
		FontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
		TabSize:    4,
		WordWrap:   "off",
		Minimap:    true,
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

// UpdateSetting updates a single setting by key and persists to disk.
// Returns an error for unknown keys or values of the wrong type.
func (s *Service) UpdateSetting(key string, value interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch key {
	case "theme":
		v, ok := value.(string)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected string", key)
		}
		s.settings.Theme = v
	case "fontSize":
		v, ok := value.(float64)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected number", key)
		}
		s.settings.FontSize = int(v)
	case "fontFamily":
		v, ok := value.(string)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected string", key)
		}
		s.settings.FontFamily = v
	case "tabSize":
		v, ok := value.(float64)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected number", key)
		}
		s.settings.TabSize = int(v)
	case "wordWrap":
		v, ok := value.(string)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected string", key)
		}
		s.settings.WordWrap = v
	case "minimap":
		v, ok := value.(bool)
		if !ok {
			return fmt.Errorf("invalid type for %q: expected bool", key)
		}
		s.settings.Minimap = v
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
