package git

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// setupTestRepo creates a temp directory with an initialized git repo, an initial commit,
// and returns the path and a configured Service.
func setupTestRepo(t *testing.T) (string, *Service) {
	t.Helper()

	dir := t.TempDir()

	// Initialize git repo
	commands := [][]string{
		{"git", "init"},
		{"git", "config", "user.email", "test@test.com"},
		{"git", "config", "user.name", "Test"},
	}

	for _, args := range commands {
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command %v failed: %v\n%s", args, err, out)
		}
	}

	// Create an initial file and commit
	initialFile := filepath.Join(dir, "README.md")
	if err := os.WriteFile(initialFile, []byte("# Test Repo\n"), 0644); err != nil {
		t.Fatal(err)
	}

	commitCmds := [][]string{
		{"git", "add", "."},
		{"git", "commit", "-m", "initial commit"},
	}
	for _, args := range commitCmds {
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command %v failed: %v\n%s", args, err, out)
		}
	}

	svc := NewService()
	svc.SetContext(context.Background())

	return dir, svc
}

// runCmd is a test helper that runs a command in the given directory.
func runCmd(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command(args[0], args[1:]...)
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("command %v failed: %v\n%s", args, err, out)
	}
}

func TestGetStatus(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create an untracked file
	newFile := filepath.Join(dir, "new.txt")
	if err := os.WriteFile(newFile, []byte("new content\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Check untracked status
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	found := false
	for _, s := range statuses {
		if s.Path == "new.txt" && s.Status == "untracked" && !s.Staged {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected untracked file 'new.txt', got: %+v", statuses)
	}

	// Stage the file and verify staged status
	runCmd(t, dir, "git", "add", "new.txt")

	statuses, err = svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	found = false
	for _, s := range statuses {
		if s.Path == "new.txt" && s.Status == "added" && s.Staged {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected staged added file 'new.txt', got: %+v", statuses)
	}

	// Modify a tracked file and verify modified status
	readme := filepath.Join(dir, "README.md")
	if err := os.WriteFile(readme, []byte("# Updated Repo\n"), 0644); err != nil {
		t.Fatal(err)
	}

	statuses, err = svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	found = false
	for _, s := range statuses {
		if s.Path == "README.md" && s.Status == "modified" && !s.Staged {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected unstaged modified file 'README.md', got: %+v", statuses)
	}
}

func TestGetBranch(t *testing.T) {
	dir, svc := setupTestRepo(t)

	info, err := svc.GetBranch(dir)
	if err != nil {
		t.Fatalf("GetBranch failed: %v", err)
	}

	// The default branch could be "main" or "master" depending on git config
	if info.Name == "" {
		t.Error("expected non-empty branch name")
	}

	if info.Commit == "" {
		t.Error("expected non-empty commit hash")
	}

	// Commit hash should be a short hash (7-10 chars typically)
	if len(info.Commit) < 4 || len(info.Commit) > 40 {
		t.Errorf("unexpected commit hash length: %q", info.Commit)
	}

	// Without upstream, ahead/behind should be 0
	if info.Ahead != 0 || info.Behind != 0 {
		t.Errorf("expected ahead=0 behind=0 without upstream, got ahead=%d behind=%d", info.Ahead, info.Behind)
	}
}

func TestGetDiff(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Modify a tracked file
	readme := filepath.Join(dir, "README.md")
	if err := os.WriteFile(readme, []byte("# Updated Repo\nNew line added\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Get unstaged diff
	diff, err := svc.GetDiff(dir, "README.md", false)
	if err != nil {
		t.Fatalf("GetDiff failed: %v", err)
	}

	if !strings.Contains(diff, "Updated Repo") {
		t.Errorf("expected diff to contain 'Updated Repo', got: %s", diff)
	}
	if !strings.Contains(diff, "New line added") {
		t.Errorf("expected diff to contain 'New line added', got: %s", diff)
	}

	// Stage it and check staged diff
	runCmd(t, dir, "git", "add", "README.md")

	stagedDiff, err := svc.GetDiff(dir, "README.md", true)
	if err != nil {
		t.Fatalf("GetDiff (staged) failed: %v", err)
	}

	if !strings.Contains(stagedDiff, "Updated Repo") {
		t.Errorf("expected staged diff to contain 'Updated Repo', got: %s", stagedDiff)
	}
}

func TestStageFile(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create a new file
	newFile := filepath.Join(dir, "stage_test.txt")
	if err := os.WriteFile(newFile, []byte("staging test\n"), 0644); err != nil {
		t.Fatal(err)
	}

	// Stage the file
	if err := svc.StageFile(dir, "stage_test.txt"); err != nil {
		t.Fatalf("StageFile failed: %v", err)
	}

	// Verify it's staged
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	found := false
	for _, s := range statuses {
		if s.Path == "stage_test.txt" && s.Staged {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected staged file 'stage_test.txt', got: %+v", statuses)
	}
}

func TestUnstageFile(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create and stage a new file
	newFile := filepath.Join(dir, "unstage_test.txt")
	if err := os.WriteFile(newFile, []byte("unstaging test\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runCmd(t, dir, "git", "add", "unstage_test.txt")

	// Verify it's staged
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}
	stagedBefore := false
	for _, s := range statuses {
		if s.Path == "unstage_test.txt" && s.Staged {
			stagedBefore = true
			break
		}
	}
	if !stagedBefore {
		t.Fatal("expected file to be staged before unstage")
	}

	// Unstage the file
	if err := svc.UnstageFile(dir, "unstage_test.txt"); err != nil {
		t.Fatalf("UnstageFile failed: %v", err)
	}

	// Verify it's no longer staged (should be untracked now)
	statuses, err = svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	for _, s := range statuses {
		if s.Path == "unstage_test.txt" && s.Staged {
			t.Errorf("expected file to be unstaged, but it's still staged: %+v", s)
		}
	}
}

func TestCommit(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create and stage a file
	newFile := filepath.Join(dir, "commit_test.txt")
	if err := os.WriteFile(newFile, []byte("commit test\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runCmd(t, dir, "git", "add", "commit_test.txt")

	// Commit
	commitMsg := "test: add commit_test.txt"
	if err := svc.Commit(dir, commitMsg); err != nil {
		t.Fatalf("Commit failed: %v", err)
	}

	// Verify the commit appears in the log
	entries, err := svc.GetLog(dir, 1)
	if err != nil {
		t.Fatalf("GetLog failed: %v", err)
	}

	if len(entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(entries))
	}

	if entries[0].Message != commitMsg {
		t.Errorf("expected commit message %q, got %q", commitMsg, entries[0].Message)
	}
}

func TestGetLog(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Make 3 additional commits (1 already exists from setupTestRepo)
	for i := 1; i <= 3; i++ {
		filename := filepath.Join(dir, fmt.Sprintf("file%d.txt", i))
		if err := os.WriteFile(filename, []byte("content\n"), 0644); err != nil {
			t.Fatal(err)
		}
		runCmd(t, dir, "git", "add", ".")
		runCmd(t, dir, "git", "commit", "-m", fmt.Sprintf("commit %d", i))
	}

	// Get log with limit 2
	entries, err := svc.GetLog(dir, 2)
	if err != nil {
		t.Fatalf("GetLog failed: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 log entries, got %d: %+v", len(entries), entries)
	}

	// Verify entries have required fields
	for i, entry := range entries {
		if entry.Hash == "" {
			t.Errorf("entry[%d]: expected non-empty hash", i)
		}
		if entry.ShortHash == "" {
			t.Errorf("entry[%d]: expected non-empty short hash", i)
		}
		if entry.Message == "" {
			t.Errorf("entry[%d]: expected non-empty message", i)
		}
		if entry.Author == "" {
			t.Errorf("entry[%d]: expected non-empty author", i)
		}
		if entry.RelativeTime == "" {
			t.Errorf("entry[%d]: expected non-empty relative time", i)
		}
	}

	// Most recent commit should be first
	if entries[0].Message != "commit 3" {
		t.Errorf("expected most recent commit first, got %q", entries[0].Message)
	}

	// Get all entries
	allEntries, err := svc.GetLog(dir, 10)
	if err != nil {
		t.Fatalf("GetLog failed: %v", err)
	}
	// 1 initial + 3 additional = 4
	if len(allEntries) != 4 {
		t.Errorf("expected 4 total entries, got %d", len(allEntries))
	}
}

func TestNotARepo(t *testing.T) {
	dir := t.TempDir() // Not a git repo

	svc := NewService()
	svc.SetContext(context.Background())

	_, err := svc.GetStatus(dir)
	if err == nil {
		t.Fatal("expected error when calling GetStatus on a non-repo directory")
	}

	if !strings.Contains(err.Error(), "git") {
		t.Errorf("expected error message to mention git, got: %v", err)
	}
}

func TestGetStatus_empty(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// With no changes, status should return empty slice
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	if len(statuses) != 0 {
		t.Errorf("expected no status entries for clean repo, got: %+v", statuses)
	}
}

func TestGetBranch_UnbornHead(t *testing.T) {
	dir := t.TempDir()

	// Initialize git repo without any commits
	commands := [][]string{
		{"git", "init"},
		{"git", "config", "user.email", "test@test.com"},
		{"git", "config", "user.name", "Test"},
	}
	for _, args := range commands {
		cmd := exec.Command(args[0], args[1:]...)
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("command %v failed: %v\n%s", args, err, out)
		}
	}

	svc := NewService()
	svc.SetContext(context.Background())

	// GetBranch should succeed even with no commits
	info, err := svc.GetBranch(dir)
	if err != nil {
		t.Fatalf("GetBranch should not fail on unborn HEAD, got: %v", err)
	}

	// Commit should be empty for unborn HEAD
	if info.Commit != "" {
		t.Errorf("expected empty commit for unborn HEAD, got %q", info.Commit)
	}
}

func TestStageAll(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create multiple untracked files
	for i := 1; i <= 3; i++ {
		f := filepath.Join(dir, fmt.Sprintf("stageall_%d.txt", i))
		if err := os.WriteFile(f, []byte("content\n"), 0644); err != nil {
			t.Fatal(err)
		}
	}

	// Stage all
	if err := svc.StageAll(dir); err != nil {
		t.Fatalf("StageAll failed: %v", err)
	}

	// Verify all are staged
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	for _, s := range statuses {
		if strings.HasPrefix(s.Path, "stageall_") && !s.Staged {
			t.Errorf("expected %s to be staged, got: %+v", s.Path, s)
		}
	}
}

func TestUnstageAll(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create and stage multiple files
	for i := 1; i <= 3; i++ {
		f := filepath.Join(dir, fmt.Sprintf("unstageall_%d.txt", i))
		if err := os.WriteFile(f, []byte("content\n"), 0644); err != nil {
			t.Fatal(err)
		}
	}
	runCmd(t, dir, "git", "add", ".")

	// Unstage all
	if err := svc.UnstageAll(dir); err != nil {
		t.Fatalf("UnstageAll failed: %v", err)
	}

	// Verify none are staged
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	for _, s := range statuses {
		if strings.HasPrefix(s.Path, "unstageall_") && s.Staged {
			t.Errorf("expected %s to be unstaged, got: %+v", s.Path, s)
		}
	}
}

func TestGetStatus_MergeConflict(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create a branch and modify README on it
	runCmd(t, dir, "git", "checkout", "-b", "feature")
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("feature change\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runCmd(t, dir, "git", "add", ".")
	runCmd(t, dir, "git", "commit", "-m", "feature commit")

	// Go back to the default branch and make a conflicting change
	// Get the default branch name first
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = dir
	// We're on feature, go back to original branch
	runCmd(t, dir, "git", "checkout", "-")
	if err := os.WriteFile(filepath.Join(dir, "README.md"), []byte("main change\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runCmd(t, dir, "git", "add", ".")
	runCmd(t, dir, "git", "commit", "-m", "main commit")

	// Attempt to merge feature (this should fail with a conflict)
	mergeCmd := exec.Command("git", "merge", "feature")
	mergeCmd.Dir = dir
	mergeCmd.CombinedOutput() // ignore error — conflict is expected

	// GetStatus should show the conflict
	statuses, err := svc.GetStatus(dir)
	if err != nil {
		t.Fatalf("GetStatus failed: %v", err)
	}

	found := false
	for _, s := range statuses {
		if s.Path == "README.md" && s.Status == "conflict" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected conflict status for README.md, got: %+v", statuses)
	}
}

func TestGetLog_PipeInMessage(t *testing.T) {
	dir, svc := setupTestRepo(t)

	// Create a commit with a pipe character in the message
	f := filepath.Join(dir, "pipe_test.txt")
	if err := os.WriteFile(f, []byte("content\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runCmd(t, dir, "git", "add", ".")
	runCmd(t, dir, "git", "commit", "-m", "fix: handle a|b pipe case")

	entries, err := svc.GetLog(dir, 1)
	if err != nil {
		t.Fatalf("GetLog failed: %v", err)
	}

	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}

	if entries[0].Message != "fix: handle a|b pipe case" {
		t.Errorf("expected message with pipe, got %q", entries[0].Message)
	}
}
