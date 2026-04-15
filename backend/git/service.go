package git

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"sync"
)

// FileStatus represents the status of a single file in the git working tree.
type FileStatus struct {
	Path    string `json:"path"`
	Status  string `json:"status"` // "modified", "added", "deleted", "renamed", "untracked", "copied", "conflict"
	Staged  bool   `json:"staged"`
	OldPath string `json:"oldPath"` // populated for renames
}

// BranchInfo holds information about the current git branch.
type BranchInfo struct {
	Name   string `json:"name"`
	Commit string `json:"commit"`
	Ahead  int    `json:"ahead"`
	Behind int    `json:"behind"`
}

// LogEntry represents a single commit in the git log.
type LogEntry struct {
	Hash         string `json:"hash"`
	ShortHash    string `json:"shortHash"`
	Message      string `json:"message"`
	Author       string `json:"author"`
	RelativeTime string `json:"relativeTime"`
}

// Service provides git integration functionality by shelling out to the git CLI.
type Service struct {
	mu  sync.Mutex
	ctx context.Context
}

// NewService creates a new git service.
func NewService() *Service {
	return &Service{}
}

// SetContext stores the Wails runtime context.
// Must be called from the app's OnStartup hook.
func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// runGit executes a git command with the given arguments in the specified directory.
func (s *Service) runGit(rootPath string, args ...string) (string, error) {
	fullArgs := append([]string{"-C", rootPath}, args...)
	cmd := exec.CommandContext(s.ctx, "git", fullArgs...)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w\n%s", strings.Join(args, " "), err, string(output))
	}
	return strings.TrimRight(string(output), "\n"), nil
}

// runGitStdout executes a git command and returns stdout only.
func (s *Service) runGitStdout(rootPath string, args ...string) (string, error) {
	fullArgs := append([]string{"-C", rootPath}, args...)
	cmd := exec.CommandContext(s.ctx, "git", fullArgs...)

	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("git %s failed: %w", strings.Join(args, " "), err)
	}
	return strings.TrimRight(string(output), "\n"), nil
}

// mapStatusChar maps a git status character to a human-readable status string.
func mapStatusChar(c byte) string {
	switch c {
	case 'M':
		return "modified"
	case 'A':
		return "added"
	case 'D':
		return "deleted"
	case 'R':
		return "renamed"
	case 'C':
		return "copied"
	case 'U':
		return "conflict"
	default:
		return "modified"
	}
}

// GetStatus runs `git status --porcelain=v2` and parses the output into FileStatus entries.
func (s *Service) GetStatus(rootPath string) ([]FileStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	output, err := s.runGitStdout(rootPath, "status", "--porcelain=v2")
	if err != nil {
		return nil, err
	}

	if output == "" {
		return []FileStatus{}, nil
	}

	var statuses []FileStatus
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		if strings.HasPrefix(line, "# ") {
			// Header lines, skip
			continue
		}

		if strings.HasPrefix(line, "? ") {
			// Untracked file
			path := line[2:]
			statuses = append(statuses, FileStatus{
				Path:   path,
				Status: "untracked",
				Staged: false,
			})
			continue
		}

		if strings.HasPrefix(line, "1 ") {
			// Ordinary changed entry: "1 XY sub mH mI mW hH hI path"
			fields := strings.SplitN(line, " ", 9)
			if len(fields) < 9 {
				continue
			}
			xy := fields[1]
			path := fields[8]

			x := xy[0] // staged status
			y := xy[1] // unstaged status

			if x != '.' {
				statuses = append(statuses, FileStatus{
					Path:   path,
					Status: mapStatusChar(x),
					Staged: true,
				})
			}
			if y != '.' {
				statuses = append(statuses, FileStatus{
					Path:   path,
					Status: mapStatusChar(y),
					Staged: false,
				})
			}
			continue
		}

		if strings.HasPrefix(line, "2 ") {
			// Rename/copy entry: "2 XY sub mH mI mW hH hI Xscore path\torigPath"
			fields := strings.SplitN(line, " ", 10)
			if len(fields) < 10 {
				continue
			}
			xy := fields[1]
			pathPart := fields[9]

			// path and origPath are separated by tab
			paths := strings.SplitN(pathPart, "\t", 2)
			newPath := paths[0]
			oldPath := ""
			if len(paths) > 1 {
				oldPath = paths[1]
			}

			x := xy[0]
			y := xy[1]

			if x != '.' {
				statuses = append(statuses, FileStatus{
					Path:    newPath,
					Status:  mapStatusChar(x),
					Staged:  true,
					OldPath: oldPath,
				})
			}
			if y != '.' {
				statuses = append(statuses, FileStatus{
					Path:    newPath,
					Status:  mapStatusChar(y),
					Staged:  false,
					OldPath: oldPath,
				})
			}
			continue
		}

		if strings.HasPrefix(line, "u ") {
			// Merge conflict entry: "u XY sub m1 m2 m3 mW h1 h2 h3 path"
			fields := strings.SplitN(line, " ", 11)
			if len(fields) < 11 {
				continue
			}
			path := fields[10]
			statuses = append(statuses, FileStatus{
				Path:   path,
				Status: "conflict",
				Staged: false,
			})
			continue
		}
	}

	return statuses, nil
}

// GetBranch returns information about the current git branch.
// On a freshly initialized repo with no commits, returns an empty commit hash.
func (s *Service) GetBranch(rootPath string) (BranchInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	info := BranchInfo{}

	// Get branch name
	name, err := s.runGitStdout(rootPath, "branch", "--show-current")
	if err != nil {
		return info, err
	}
	info.Name = name

	// Get short commit hash — may fail on a repo with no commits (unborn HEAD)
	commit, err := s.runGitStdout(rootPath, "rev-parse", "--short", "HEAD")
	if err != nil {
		// Unborn HEAD (no commits yet) — not a fatal error
		info.Commit = ""
	} else {
		info.Commit = commit
	}

	// Get ahead/behind count relative to upstream
	// This may fail if there's no upstream configured, so we ignore errors
	abOutput, err := s.runGitStdout(rootPath, "rev-list", "--count", "--left-right", "@{upstream}...HEAD")
	if err == nil && abOutput != "" {
		parts := strings.Split(abOutput, "\t")
		if len(parts) == 2 {
			behind, _ := strconv.Atoi(parts[0])
			ahead, _ := strconv.Atoi(parts[1])
			info.Behind = behind
			info.Ahead = ahead
		}
	}
	// If error, ahead/behind stay at 0

	return info, nil
}

// GetDiff returns the diff output for a specific file.
// If staged is true, shows the cached (staged) diff; otherwise shows the working tree diff.
func (s *Service) GetDiff(rootPath, filePath string, staged bool) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var args []string
	if staged {
		args = []string{"diff", "--cached", "--", filePath}
	} else {
		args = []string{"diff", "--", filePath}
	}

	output, err := s.runGitStdout(rootPath, args...)
	if err != nil {
		return "", err
	}
	return output, nil
}

// StageFile stages a file for commit using `git add`.
func (s *Service) StageFile(rootPath, filePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.runGit(rootPath, "add", "--", filePath)
	return err
}

// UnstageFile unstages a file using `git reset HEAD`.
func (s *Service) UnstageFile(rootPath, filePath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.runGit(rootPath, "reset", "HEAD", "--", filePath)
	return err
}

// StageAll stages all changes for commit using `git add .`.
func (s *Service) StageAll(rootPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.runGit(rootPath, "add", ".")
	return err
}

// UnstageAll unstages all staged changes using `git reset HEAD .`.
func (s *Service) UnstageAll(rootPath string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.runGit(rootPath, "reset", "HEAD", ".")
	return err
}

// Commit creates a new commit with the given message.
func (s *Service) Commit(rootPath, message string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.runGit(rootPath, "commit", "-m", message)
	return err
}

// GetLog returns the most recent commits from the git log.
func (s *Service) GetLog(rootPath string, limit int) ([]LogEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	limitStr := fmt.Sprintf("-%d", limit)
	// Use NUL byte (%x00) as delimiter to avoid issues with | in commit messages
	output, err := s.runGitStdout(rootPath, "log", limitStr, "--format=%H%x00%h%x00%s%x00%an%x00%ar")
	if err != nil {
		return nil, err
	}

	if output == "" {
		return []LogEntry{}, nil
	}

	var entries []LogEntry
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\x00", 5)
		if len(parts) < 5 {
			continue
		}
		entries = append(entries, LogEntry{
			Hash:         parts[0],
			ShortHash:    parts[1],
			Message:      parts[2],
			Author:       parts[3],
			RelativeTime: parts[4],
		})
	}

	return entries, nil
}
