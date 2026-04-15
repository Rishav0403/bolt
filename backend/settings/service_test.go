package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultSettings(t *testing.T) {
	s := DefaultSettings()
	if s.Theme != "vs-dark" {
		t.Errorf("expected theme 'vs-dark', got '%s'", s.Theme)
	}
	if s.FontSize != 14 {
		t.Errorf("expected fontSize 14, got %d", s.FontSize)
	}
	if s.FontFamily != "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace" {
		t.Errorf("expected default fontFamily, got '%s'", s.FontFamily)
	}
	if s.TabSize != 4 {
		t.Errorf("expected tabSize 4, got %d", s.TabSize)
	}
	if s.WordWrap != "off" {
		t.Errorf("expected wordWrap 'off', got '%s'", s.WordWrap)
	}
	if s.Minimap != true {
		t.Error("expected minimap to be true")
	}
}

func TestNewService_Defaults(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	got := svc.GetSettings()
	if got.Theme != "vs-dark" {
		t.Errorf("expected default theme 'vs-dark', got '%s'", got.Theme)
	}
}

func TestUpdateSetting(t *testing.T) {
	dir := t.TempDir()
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(dir, "bolt", "settings.json"),
	}

	err := svc.UpdateSetting("theme", "vs-light")
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.Theme != "vs-light" {
		t.Errorf("expected theme 'vs-light', got '%s'", got.Theme)
	}

	// Verify persisted to disk
	data, err := os.ReadFile(svc.filePath)
	if err != nil {
		t.Fatalf("failed to read settings file: %v", err)
	}

	var persisted Settings
	json.Unmarshal(data, &persisted)
	if persisted.Theme != "vs-light" {
		t.Errorf("persisted theme should be 'vs-light', got '%s'", persisted.Theme)
	}
}

func TestUpdateSetting_FontSize(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("fontSize", float64(16))
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.FontSize != 16 {
		t.Errorf("expected fontSize 16, got %d", got.FontSize)
	}
}

func TestUpdateSetting_Minimap(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("minimap", false)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.Minimap != false {
		t.Error("expected minimap to be false")
	}
}

func TestUpdateSetting_UnknownKey(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("unknownKey", "value")
	if err == nil {
		t.Fatal("expected error for unknown key, got nil")
	}

	// Settings should remain unchanged
	got := svc.GetSettings()
	if got.Theme != "vs-dark" {
		t.Errorf("expected theme to remain 'vs-dark', got '%s'", got.Theme)
	}
}

func TestUpdateSetting_WrongType(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	// Pass a string for fontSize (expects float64)
	err := svc.UpdateSetting("fontSize", "not-a-number")
	if err == nil {
		t.Fatal("expected error for wrong type on fontSize, got nil")
	}

	// FontSize should remain unchanged
	got := svc.GetSettings()
	if got.FontSize != 14 {
		t.Errorf("expected fontSize to remain 14, got %d", got.FontSize)
	}

	// Pass a float64 for theme (expects string)
	err = svc.UpdateSetting("theme", float64(42))
	if err == nil {
		t.Fatal("expected error for wrong type on theme, got nil")
	}

	// Pass a string for minimap (expects bool)
	err = svc.UpdateSetting("minimap", "true")
	if err == nil {
		t.Fatal("expected error for wrong type on minimap, got nil")
	}
}

func TestLoadSettings(t *testing.T) {
	dir := t.TempDir()
	settingsPath := filepath.Join(dir, "settings.json")

	// Write a settings file
	s := Settings{
		Theme:      "monokai",
		FontSize:   18,
		FontFamily: "Fira Code",
		TabSize:    2,
		WordWrap:   "on",
		Minimap:    false,
	}
	data, _ := json.MarshalIndent(s, "", "  ")
	os.WriteFile(settingsPath, data, 0644)

	// Create service that loads from this path
	svc := &Service{
		settings: DefaultSettings(),
		filePath: settingsPath,
	}
	svc.load()

	got := svc.GetSettings()
	if got.Theme != "monokai" {
		t.Errorf("expected theme 'monokai', got '%s'", got.Theme)
	}
	if got.FontSize != 18 {
		t.Errorf("expected fontSize 18, got %d", got.FontSize)
	}
	if got.TabSize != 2 {
		t.Errorf("expected tabSize 2, got %d", got.TabSize)
	}
}

func TestUpdateAllSettings(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	newSettings := Settings{
		Theme:      "solarized",
		FontSize:   12,
		FontFamily: "Monaco",
		TabSize:    8,
		WordWrap:   "bounded",
		Minimap:    false,
	}

	err := svc.UpdateAllSettings(newSettings)
	if err != nil {
		t.Fatalf("UpdateAllSettings failed: %v", err)
	}

	got := svc.GetSettings()
	if got.Theme != "solarized" {
		t.Errorf("expected theme 'solarized', got '%s'", got.Theme)
	}
	if got.TabSize != 8 {
		t.Errorf("expected tabSize 8, got %d", got.TabSize)
	}
}
