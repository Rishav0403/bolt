package fs

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	// Create test structure:
	// dir/
	//   alpha/
	//     nested.txt
	//   beta/
	//   hello.go
	//   readme.md
	//   .hidden
	os.MkdirAll(filepath.Join(dir, "alpha"), 0755)
	os.MkdirAll(filepath.Join(dir, "beta"), 0755)
	os.WriteFile(filepath.Join(dir, "alpha", "nested.txt"), []byte("nested content"), 0644)
	os.WriteFile(filepath.Join(dir, "hello.go"), []byte("package main"), 0644)
	os.WriteFile(filepath.Join(dir, "readme.md"), []byte("# Readme"), 0644)
	os.WriteFile(filepath.Join(dir, ".hidden"), []byte("hidden"), 0644)

	return dir
}

func TestListDir(t *testing.T) {
	dir := setupTestDir(t)
	svc := NewService()

	entries, err := svc.ListDir(dir)
	if err != nil {
		t.Fatalf("ListDir failed: %v", err)
	}

	// Should have 4 entries (2 dirs + 2 files, .hidden is skipped)
	if len(entries) != 4 {
		t.Fatalf("expected 4 entries, got %d", len(entries))
	}

	// Directories should come first
	if !entries[0].IsDir || entries[0].Name != "alpha" {
		t.Errorf("expected first entry to be dir 'alpha', got %+v", entries[0])
	}
	if !entries[1].IsDir || entries[1].Name != "beta" {
		t.Errorf("expected second entry to be dir 'beta', got %+v", entries[1])
	}

	// Files should come after, sorted alphabetically
	if entries[2].IsDir || entries[2].Name != "hello.go" {
		t.Errorf("expected third entry to be file 'hello.go', got %+v", entries[2])
	}
	if entries[3].IsDir || entries[3].Name != "readme.md" {
		t.Errorf("expected fourth entry to be file 'readme.md', got %+v", entries[3])
	}

	// Check extension
	if entries[2].Extension != "go" {
		t.Errorf("expected extension 'go', got '%s'", entries[2].Extension)
	}

	// Check that alpha has children (nested.txt)
	if len(entries[0].Children) != 1 {
		t.Errorf("expected alpha to have 1 child, got %d", len(entries[0].Children))
	}
}

func TestListDir_NonExistent(t *testing.T) {
	svc := NewService()
	_, err := svc.ListDir("/nonexistent/path")
	if err == nil {
		t.Fatal("expected error for non-existent path")
	}
}

func TestReadFile(t *testing.T) {
	dir := setupTestDir(t)
	svc := NewService()

	content, err := svc.ReadFile(filepath.Join(dir, "hello.go"))
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	if content != "package main" {
		t.Errorf("expected 'package main', got '%s'", content)
	}
}

func TestReadFile_NonExistent(t *testing.T) {
	svc := NewService()
	_, err := svc.ReadFile("/nonexistent/file.txt")
	if err == nil {
		t.Fatal("expected error for non-existent file")
	}
}

func TestWriteFile(t *testing.T) {
	dir := t.TempDir()
	svc := NewService()

	path := filepath.Join(dir, "output.txt")
	err := svc.WriteFile(path, "hello world")
	if err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read written file: %v", err)
	}
	if string(data) != "hello world" {
		t.Errorf("expected 'hello world', got '%s'", string(data))
	}
}

func TestWriteFile_CreatesParentDirs(t *testing.T) {
	dir := t.TempDir()
	svc := NewService()

	path := filepath.Join(dir, "sub", "dir", "file.txt")
	err := svc.WriteFile(path, "deep content")
	if err != nil {
		t.Fatalf("WriteFile failed: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read written file: %v", err)
	}
	if string(data) != "deep content" {
		t.Errorf("expected 'deep content', got '%s'", string(data))
	}
}

func TestCreateFile(t *testing.T) {
	dir := t.TempDir()
	svc := NewService()

	path := filepath.Join(dir, "new.txt")
	err := svc.CreateFile(path)
	if err != nil {
		t.Fatalf("CreateFile failed: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("file not created: %v", err)
	}
	if info.IsDir() {
		t.Error("expected file, got directory")
	}
}

func TestCreateDir(t *testing.T) {
	dir := t.TempDir()
	svc := NewService()

	path := filepath.Join(dir, "newdir")
	err := svc.CreateDir(path)
	if err != nil {
		t.Fatalf("CreateDir failed: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("dir not created: %v", err)
	}
	if !info.IsDir() {
		t.Error("expected directory, got file")
	}
}

func TestDeletePath(t *testing.T) {
	dir := setupTestDir(t)
	svc := NewService()

	path := filepath.Join(dir, "hello.go")
	err := svc.DeletePath(path)
	if err != nil {
		t.Fatalf("DeletePath failed: %v", err)
	}

	_, err = os.Stat(path)
	if !os.IsNotExist(err) {
		t.Error("expected file to be deleted")
	}
}

func TestDeletePath_Directory(t *testing.T) {
	dir := setupTestDir(t)
	svc := NewService()

	path := filepath.Join(dir, "alpha")
	err := svc.DeletePath(path)
	if err != nil {
		t.Fatalf("DeletePath failed: %v", err)
	}

	_, err = os.Stat(path)
	if !os.IsNotExist(err) {
		t.Error("expected directory to be deleted")
	}
}

func TestRenamePath(t *testing.T) {
	dir := setupTestDir(t)
	svc := NewService()

	oldPath := filepath.Join(dir, "hello.go")
	newPath := filepath.Join(dir, "main.go")
	err := svc.RenamePath(oldPath, newPath)
	if err != nil {
		t.Fatalf("RenamePath failed: %v", err)
	}

	_, err = os.Stat(oldPath)
	if !os.IsNotExist(err) {
		t.Error("expected old path to not exist")
	}

	_, err = os.Stat(newPath)
	if err != nil {
		t.Error("expected new path to exist")
	}
}
