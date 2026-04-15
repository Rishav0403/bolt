//go:build !windows

package terminal

import (
	"os/exec"
	"syscall"
)

// setProcAttr sets POSIX-specific process attributes (e.g. Setpgid).
func setProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
}

// signalProcess sends SIGHUP to the process group, falling back to the
// process itself if the group signal fails.
func signalProcess(cmd *exec.Cmd) {
	if cmd.Process == nil {
		return
	}
	if err := syscall.Kill(-cmd.Process.Pid, syscall.SIGHUP); err != nil {
		_ = cmd.Process.Signal(syscall.SIGHUP)
	}
}
