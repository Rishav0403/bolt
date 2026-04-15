package terminal

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"syscall"

	"github.com/creack/pty"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// TerminalInfo describes a terminal instance for the frontend.
type TerminalInfo struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Running bool   `json:"running"`
}

// session holds state for a single PTY terminal instance.
type session struct {
	pty    *os.File
	cmd    *exec.Cmd
	title  string
	cancel context.CancelFunc
}

// Service manages multiple terminal instances (PTY sessions).
type Service struct {
	mu       sync.Mutex
	sessions map[string]*session
	ctx      context.Context
}

// NewService creates a new terminal service with an empty sessions map.
func NewService() *Service {
	return &Service{
		sessions: make(map[string]*session),
	}
}

// SetContext stores the Wails runtime context, required for EventsEmit.
// Must be called from the app's OnStartup hook.
func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// detectShell returns the path to an available shell on the system.
func detectShell() string {
	if runtime.GOOS == "windows" {
		// Try PowerShell first, then cmd.exe
		if path, err := exec.LookPath("powershell.exe"); err == nil {
			return path
		}
		if path, err := exec.LookPath("cmd.exe"); err == nil {
			return path
		}
		return "cmd.exe"
	}

	// Unix: check $SHELL env var first
	if shell := os.Getenv("SHELL"); shell != "" {
		if _, err := os.Stat(shell); err == nil {
			return shell
		}
	}

	// Fall back to common shells
	for _, sh := range []string{"/bin/bash", "/bin/sh"} {
		if _, err := os.Stat(sh); err == nil {
			return sh
		}
	}

	return "/bin/sh"
}

// CreateTerminal creates a new PTY terminal session with the given ID.
func (s *Service) CreateTerminal(id string) error {
	s.mu.Lock()

	if _, exists := s.sessions[id]; exists {
		s.mu.Unlock()
		return fmt.Errorf("terminal already exists: %s", id)
	}

	shell := detectShell()
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	ptmx, err := pty.Start(cmd)
	if err != nil {
		// Retry without Setpgid in case the environment does not permit it
		cmd = exec.Command(shell)
		cmd.Env = append(os.Environ(), "TERM=xterm-256color")
		ptmx, err = pty.Start(cmd)
		if err != nil {
			s.mu.Unlock()
			return fmt.Errorf("failed to start terminal: %w", err)
		}
	}

	readCtx, cancel := context.WithCancel(context.Background())

	sess := &session{
		pty:    ptmx,
		cmd:    cmd,
		title:  shell,
		cancel: cancel,
	}
	s.sessions[id] = sess

	s.mu.Unlock()

	// Start a goroutine that reads PTY output and emits events
	go s.readLoop(readCtx, id, sess)

	return nil
}

// readLoop reads from the PTY in 4KB chunks and emits base64-encoded output events.
func (s *Service) readLoop(ctx context.Context, id string, sess *session) {
	buf := make([]byte, 4096)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		n, err := sess.pty.Read(buf)
		if n > 0 {
			encoded := base64.StdEncoding.EncodeToString(buf[:n])
			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "terminal:output:"+id, encoded)
			}
		}
		if err != nil {
			// PTY closed or EOF — wait for process exit and emit exit event
			exitCode := 0
			if waitErr := sess.cmd.Wait(); waitErr != nil {
				if exitErr, ok := waitErr.(*exec.ExitError); ok {
					exitCode = exitErr.ExitCode()
				} else {
					exitCode = -1
				}
			}

			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "terminal:exit:"+id, exitCode)
			}

			// Clean up the session from the map
			s.mu.Lock()
			delete(s.sessions, id)
			s.mu.Unlock()
			return
		}
	}
}

// WriteTerminal writes base64-encoded data to the terminal's PTY.
func (s *Service) WriteTerminal(id string, data string) error {
	s.mu.Lock()
	sess, ok := s.sessions[id]
	s.mu.Unlock()

	if !ok {
		return fmt.Errorf("terminal not found: %s", id)
	}

	decoded, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return fmt.Errorf("failed to decode base64 data: %w", err)
	}

	_, err = sess.pty.Write(decoded)
	return err
}

// ResizeTerminal resizes the terminal's PTY to the given dimensions.
func (s *Service) ResizeTerminal(id string, cols, rows int) error {
	s.mu.Lock()
	sess, ok := s.sessions[id]
	s.mu.Unlock()

	if !ok {
		return fmt.Errorf("terminal not found: %s", id)
	}

	return pty.Setsize(sess.pty, &pty.Winsize{
		Cols: uint16(cols),
		Rows: uint16(rows),
	})
}

// CloseTerminal closes a terminal session and cleans up its resources.
func (s *Service) CloseTerminal(id string) error {
	s.mu.Lock()
	sess, ok := s.sessions[id]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("terminal not found: %s", id)
	}
	delete(s.sessions, id)
	s.mu.Unlock()

	// Send SIGHUP to the process group (negative PID).
	// Falls back to signalling just the process if process group kill fails.
	if sess.cmd.Process != nil {
		if err := syscall.Kill(-sess.cmd.Process.Pid, syscall.SIGHUP); err != nil {
			_ = sess.cmd.Process.Signal(syscall.SIGHUP)
		}
	}

	// Close the PTY file descriptor
	_ = sess.pty.Close()

	// Cancel the read goroutine context
	sess.cancel()

	return nil
}

// ListTerminals returns information about all active terminal sessions.
func (s *Service) ListTerminals() []TerminalInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	terminals := make([]TerminalInfo, 0, len(s.sessions))
	for id, sess := range s.sessions {
		running := sess.cmd.ProcessState == nil // nil means process hasn't exited
		terminals = append(terminals, TerminalInfo{
			ID:      id,
			Title:   sess.title,
			Running: running,
		})
	}
	return terminals
}
