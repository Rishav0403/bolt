package terminal

import (
	"encoding/base64"
	"testing"
	"time"
)

func TestNewService(t *testing.T) {
	svc := NewService()
	if svc == nil {
		t.Fatal("NewService returned nil")
	}
	if svc.sessions == nil {
		t.Fatal("sessions map is nil")
	}
	if len(svc.sessions) != 0 {
		t.Fatalf("expected 0 sessions, got %d", len(svc.sessions))
	}
}

func TestCreateTerminal(t *testing.T) {
	svc := NewService()

	err := svc.CreateTerminal("test-1")
	if err != nil {
		t.Fatalf("CreateTerminal failed: %v", err)
	}
	defer svc.CloseTerminal("test-1")

	terminals := svc.ListTerminals()
	if len(terminals) != 1 {
		t.Fatalf("expected 1 terminal, got %d", len(terminals))
	}
	if terminals[0].ID != "test-1" {
		t.Errorf("expected ID 'test-1', got '%s'", terminals[0].ID)
	}
	if !terminals[0].Running {
		t.Error("expected terminal to be running")
	}
}

func TestCreateTerminal_DuplicateID(t *testing.T) {
	svc := NewService()

	err := svc.CreateTerminal("dup-1")
	if err != nil {
		t.Fatalf("first CreateTerminal failed: %v", err)
	}
	defer svc.CloseTerminal("dup-1")

	err = svc.CreateTerminal("dup-1")
	if err == nil {
		t.Fatal("expected error on duplicate ID, got nil")
	}
}

func TestWriteTerminal_NotFound(t *testing.T) {
	svc := NewService()

	err := svc.WriteTerminal("nonexistent", base64.StdEncoding.EncodeToString([]byte("hello")))
	if err == nil {
		t.Fatal("expected error for non-existent terminal, got nil")
	}
}

func TestResizeTerminal_NotFound(t *testing.T) {
	svc := NewService()

	err := svc.ResizeTerminal("nonexistent", 80, 24)
	if err == nil {
		t.Fatal("expected error for non-existent terminal, got nil")
	}
}

func TestCloseTerminal(t *testing.T) {
	svc := NewService()

	err := svc.CreateTerminal("close-1")
	if err != nil {
		t.Fatalf("CreateTerminal failed: %v", err)
	}

	// Give the read goroutine time to start
	time.Sleep(50 * time.Millisecond)

	err = svc.CloseTerminal("close-1")
	if err != nil {
		t.Fatalf("CloseTerminal failed: %v", err)
	}

	// Give the read goroutine time to clean up
	time.Sleep(50 * time.Millisecond)

	terminals := svc.ListTerminals()
	if len(terminals) != 0 {
		t.Fatalf("expected 0 terminals after close, got %d", len(terminals))
	}
}

func TestCloseTerminal_NotFound(t *testing.T) {
	svc := NewService()

	err := svc.CloseTerminal("nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent terminal, got nil")
	}
}

func TestDetectShell(t *testing.T) {
	shell := detectShell()
	if shell == "" {
		t.Fatal("detectShell returned empty string")
	}
	t.Logf("detected shell: %s", shell)
}

func TestCreateAndWrite(t *testing.T) {
	svc := NewService()

	err := svc.CreateTerminal("write-1")
	if err != nil {
		t.Fatalf("CreateTerminal failed: %v", err)
	}
	defer svc.CloseTerminal("write-1")

	// Give the shell time to initialize
	time.Sleep(100 * time.Millisecond)

	// Write "echo hello\n" to the terminal
	input := base64.StdEncoding.EncodeToString([]byte("echo hello\n"))
	err = svc.WriteTerminal("write-1", input)
	if err != nil {
		t.Fatalf("WriteTerminal failed: %v", err)
	}

	// Wait briefly for the command to execute
	time.Sleep(200 * time.Millisecond)

	// Verify terminal is still running
	terminals := svc.ListTerminals()
	found := false
	for _, ti := range terminals {
		if ti.ID == "write-1" {
			found = true
			if !ti.Running {
				t.Error("expected terminal to still be running")
			}
		}
	}
	if !found {
		t.Error("terminal 'write-1' not found in list")
	}
}
