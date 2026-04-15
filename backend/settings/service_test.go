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

// --- New tests for Phase 2 features ---

func TestDefaultSettings_NewFields(t *testing.T) {
	s := DefaultSettings()

	if s.TerminalShell != "" {
		t.Errorf("expected terminalShell '', got '%s'", s.TerminalShell)
	}
	if s.TerminalFontSize != 13 {
		t.Errorf("expected terminalFontSize 13, got %d", s.TerminalFontSize)
	}
	if s.TerminalFontFamily != "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace" {
		t.Errorf("expected default terminalFontFamily, got '%s'", s.TerminalFontFamily)
	}
	if len(s.SearchExcludeGlobs) != 3 {
		t.Fatalf("expected 3 searchExcludeGlobs, got %d", len(s.SearchExcludeGlobs))
	}
	expectedGlobs := []string{"**/node_modules/**", "**/.git/**", "**/dist/**"}
	for i, g := range expectedGlobs {
		if s.SearchExcludeGlobs[i] != g {
			t.Errorf("expected searchExcludeGlobs[%d] = %q, got %q", i, g, s.SearchExcludeGlobs[i])
		}
	}
	if s.BreadcrumbsEnabled != true {
		t.Error("expected breadcrumbsEnabled to be true")
	}
	if s.StickyScrollEnabled != true {
		t.Error("expected stickyScrollEnabled to be true")
	}
	if s.StickyScrollMaxLines != 5 {
		t.Errorf("expected stickyScrollMaxLines 5, got %d", s.StickyScrollMaxLines)
	}
}

func TestUpdateSetting_TerminalShell(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("terminalShell", "/bin/zsh")
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.TerminalShell != "/bin/zsh" {
		t.Errorf("expected terminalShell '/bin/zsh', got '%s'", got.TerminalShell)
	}
}

func TestUpdateSetting_TerminalFontSize(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("terminalFontSize", float64(16))
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.TerminalFontSize != 16 {
		t.Errorf("expected terminalFontSize 16, got %d", got.TerminalFontSize)
	}
}

func TestUpdateSetting_SearchExcludeGlobs(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("searchExcludeGlobs", []interface{}{"*.log", "**/tmp/**"})
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if len(got.SearchExcludeGlobs) != 2 {
		t.Fatalf("expected 2 searchExcludeGlobs, got %d", len(got.SearchExcludeGlobs))
	}
	if got.SearchExcludeGlobs[0] != "*.log" {
		t.Errorf("expected searchExcludeGlobs[0] = '*.log', got '%s'", got.SearchExcludeGlobs[0])
	}
	if got.SearchExcludeGlobs[1] != "**/tmp/**" {
		t.Errorf("expected searchExcludeGlobs[1] = '**/tmp/**', got '%s'", got.SearchExcludeGlobs[1])
	}
}

func TestUpdateSetting_BreadcrumbsEnabled(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("breadcrumbsEnabled", false)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.BreadcrumbsEnabled != false {
		t.Error("expected breadcrumbsEnabled to be false")
	}
}

func TestUpdateSetting_StickyScrollEnabled(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("stickyScrollEnabled", false)
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.StickyScrollEnabled != false {
		t.Error("expected stickyScrollEnabled to be false")
	}
}

func TestUpdateSetting_StickyScrollMaxLines(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	err := svc.UpdateSetting("stickyScrollMaxLines", float64(10))
	if err != nil {
		t.Fatalf("UpdateSetting failed: %v", err)
	}

	got := svc.GetSettings()
	if got.StickyScrollMaxLines != 10 {
		t.Errorf("expected stickyScrollMaxLines 10, got %d", got.StickyScrollMaxLines)
	}
}

func TestGetSettingsSchema(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	schema := svc.GetSettingsSchema()
	if len(schema) != 13 {
		t.Fatalf("expected 13 schema entries, got %d", len(schema))
	}

	// Build a map for easy lookup
	byKey := make(map[string]SettingDescriptor)
	for _, d := range schema {
		byKey[d.Key] = d
	}

	// Verify types
	expectedTypes := map[string]string{
		"theme":              "string",
		"fontSize":           "number",
		"fontFamily":         "string",
		"tabSize":            "number",
		"wordWrap":           "string",
		"minimap":            "bool",
		"terminalShell":      "string",
		"terminalFontSize":   "number",
		"terminalFontFamily": "string",
		"searchExcludeGlobs": "array",
		"breadcrumbsEnabled": "bool",
		"stickyScrollEnabled": "bool",
		"stickyScrollMaxLines": "number",
	}

	for key, expectedType := range expectedTypes {
		d, ok := byKey[key]
		if !ok {
			t.Errorf("missing schema entry for key %q", key)
			continue
		}
		if d.Type != expectedType {
			t.Errorf("key %q: expected type %q, got %q", key, expectedType, d.Type)
		}
		if d.Description == "" {
			t.Errorf("key %q: description should not be empty", key)
		}
	}

	// Verify enum fields
	themeDesc := byKey["theme"]
	if len(themeDesc.Enum) != 3 {
		t.Errorf("expected 3 theme enum values, got %d", len(themeDesc.Enum))
	}
	wrapDesc := byKey["wordWrap"]
	if len(wrapDesc.Enum) != 4 {
		t.Errorf("expected 4 wordWrap enum values, got %d", len(wrapDesc.Enum))
	}
}

func TestGetMergedSettings_NoWorkspace(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	// Change a user setting
	svc.settings.FontSize = 20

	got := svc.GetMergedSettings("")
	if got.FontSize != 20 {
		t.Errorf("expected fontSize 20, got %d", got.FontSize)
	}
	if got.Theme != "vs-dark" {
		t.Errorf("expected theme 'vs-dark', got '%s'", got.Theme)
	}
}

func TestGetMergedSettings_WithWorkspace(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	// Set a user-level change
	svc.settings.Theme = "monokai"
	svc.settings.FontSize = 14

	// Create workspace settings
	wsDir := t.TempDir()
	boltDir := filepath.Join(wsDir, ".bolt")
	os.MkdirAll(boltDir, 0755)
	wsSettings := []byte(`{"fontSize": 18}`)
	os.WriteFile(filepath.Join(boltDir, "settings.json"), wsSettings, 0644)

	got := svc.GetMergedSettings(wsDir)
	// fontSize should be overridden by workspace
	if got.FontSize != 18 {
		t.Errorf("expected fontSize 18 from workspace, got %d", got.FontSize)
	}
	// theme should remain from user settings
	if got.Theme != "monokai" {
		t.Errorf("expected theme 'monokai' from user settings, got '%s'", got.Theme)
	}
}

func TestSaveWorkspaceSettings(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	wsDir := t.TempDir()
	toSave := DefaultSettings()
	toSave.FontSize = 22
	toSave.Theme = "solarized"

	err := svc.SaveWorkspaceSettings(wsDir, toSave)
	if err != nil {
		t.Fatalf("SaveWorkspaceSettings failed: %v", err)
	}

	// Read back and verify
	data, err := os.ReadFile(filepath.Join(wsDir, ".bolt", "settings.json"))
	if err != nil {
		t.Fatalf("failed to read workspace settings file: %v", err)
	}

	var loaded Settings
	if err := json.Unmarshal(data, &loaded); err != nil {
		t.Fatalf("failed to parse workspace settings: %v", err)
	}
	if loaded.FontSize != 22 {
		t.Errorf("expected fontSize 22, got %d", loaded.FontSize)
	}
	if loaded.Theme != "solarized" {
		t.Errorf("expected theme 'solarized', got '%s'", loaded.Theme)
	}
}

func TestGetMergedSettings_Precedence(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	// User sets fontSize=16
	svc.settings.FontSize = 16
	svc.settings.TabSize = 2

	// Workspace sets fontSize=20
	wsDir := t.TempDir()
	boltDir := filepath.Join(wsDir, ".bolt")
	os.MkdirAll(boltDir, 0755)
	wsSettings := []byte(`{"fontSize": 20}`)
	os.WriteFile(filepath.Join(boltDir, "settings.json"), wsSettings, 0644)

	got := svc.GetMergedSettings(wsDir)
	// Workspace should win for fontSize
	if got.FontSize != 20 {
		t.Errorf("expected fontSize 20 (workspace wins), got %d", got.FontSize)
	}
	// User tabSize should be preserved (not in workspace file)
	if got.TabSize != 2 {
		t.Errorf("expected tabSize 2 (from user), got %d", got.TabSize)
	}
}

func TestLoadWorkspaceSettings_NoFile(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	wsDir := t.TempDir()
	got, err := svc.LoadWorkspaceSettings(wsDir)
	if err != nil {
		t.Fatalf("LoadWorkspaceSettings failed: %v", err)
	}

	defaults := DefaultSettings()
	if got.Theme != defaults.Theme {
		t.Errorf("expected default theme, got '%s'", got.Theme)
	}
	if got.FontSize != defaults.FontSize {
		t.Errorf("expected default fontSize, got %d", got.FontSize)
	}
}

func TestLoadWorkspaceSettings_WithFile(t *testing.T) {
	svc := &Service{
		settings: DefaultSettings(),
		filePath: filepath.Join(t.TempDir(), "settings.json"),
	}

	wsDir := t.TempDir()
	boltDir := filepath.Join(wsDir, ".bolt")
	os.MkdirAll(boltDir, 0755)
	wsData := []byte(`{"theme": "solarized", "fontSize": 18}`)
	os.WriteFile(filepath.Join(boltDir, "settings.json"), wsData, 0644)

	got, err := svc.LoadWorkspaceSettings(wsDir)
	if err != nil {
		t.Fatalf("LoadWorkspaceSettings failed: %v", err)
	}
	if got.Theme != "solarized" {
		t.Errorf("expected theme 'solarized', got '%s'", got.Theme)
	}
	if got.FontSize != 18 {
		t.Errorf("expected fontSize 18, got %d", got.FontSize)
	}
}
