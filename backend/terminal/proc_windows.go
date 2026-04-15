//go:build windows

package terminal

import (
	"os"
	"os/exec"
)

// setProcAttr is a no-op on Windows (Setpgid is not supported).
func setProcAttr(cmd *exec.Cmd) {
	// No POSIX process group support on Windows.
}

// signalProcess terminates the process on Windows using os.Process.Kill,
// since SIGHUP and process-group signals are not available.
func signalProcess(cmd *exec.Cmd) {
	if cmd.Process == nil {
		return
	}
	_ = cmd.Process.Signal(os.Kill)
}
