package search

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// SearchOptions describes the parameters for a project-wide search.
type SearchOptions struct {
	Query         string   `json:"query"`
	RootPath      string   `json:"rootPath"`
	IsRegex       bool     `json:"isRegex"`
	CaseSensitive bool     `json:"caseSensitive"`
	WholeWord     bool     `json:"wholeWord"`
	IncludeGlobs  []string `json:"includeGlobs"`
	ExcludeGlobs  []string `json:"excludeGlobs"`
	MaxResults    int      `json:"maxResults"`
}

// SearchResult represents a single match from ripgrep.
type SearchResult struct {
	FilePath   string `json:"filePath"`
	LineNumber int    `json:"lineNumber"`
	Column     int    `json:"column"`
	LineText   string `json:"lineText"`
	MatchText  string `json:"matchText"`
}

// ReplaceOptions extends SearchOptions with a replacement string.
type ReplaceOptions struct {
	SearchOptions
	ReplaceText string `json:"replaceText"`
}

// Service provides project-wide search functionality by shelling out to ripgrep.
type Service struct {
	mu        sync.Mutex
	ctx       context.Context
	rgPath    string
	activeCmd *exec.Cmd
}

// NewService creates a new search service.
// It attempts to find the ripgrep binary on the system PATH.
// If ripgrep is not found, the service is still created but Search methods will return an error.
func NewService() *Service {
	rgPath, err := exec.LookPath("rg")
	if err != nil {
		log.Println("WARNING: ripgrep (rg) not found in PATH; search functionality will be unavailable")
		rgPath = ""
	}
	return &Service{
		rgPath: rgPath,
	}
}

// SetContext stores the Wails runtime context, required for EventsEmit.
// Must be called from the app's OnStartup hook.
func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

// buildArgs constructs the ripgrep command-line arguments from the given options.
func (s *Service) buildArgs(opts SearchOptions) []string {
	args := []string{"--json"}

	if !opts.IsRegex {
		args = append(args, "--fixed-strings")
	}

	if opts.CaseSensitive {
		args = append(args, "--case-sensitive")
	} else {
		args = append(args, "--ignore-case")
	}

	if opts.WholeWord {
		args = append(args, "--word-regexp")
	}

	if opts.MaxResults > 0 {
		args = append(args, "--max-count", fmt.Sprintf("%d", opts.MaxResults))
	}

	for _, glob := range opts.IncludeGlobs {
		args = append(args, "--glob", glob)
	}

	for _, glob := range opts.ExcludeGlobs {
		args = append(args, "--glob", "!"+glob)
	}

	args = append(args, "--", opts.Query, opts.RootPath)

	return args
}

// rgJSON represents the top-level structure of a ripgrep --json output line.
type rgJSON struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// rgMatchData represents the "data" field for a ripgrep match.
type rgMatchData struct {
	Path       rgText       `json:"path"`
	Lines      rgText       `json:"lines"`
	LineNumber int          `json:"line_number"`
	Submatches []rgSubmatch `json:"submatches"`
}

// rgText holds a text value from ripgrep JSON output.
type rgText struct {
	Text string `json:"text"`
}

// rgSubmatch represents a single submatch within a ripgrep match.
type rgSubmatch struct {
	Match rgText `json:"match"`
	Start int    `json:"start"`
	End   int    `json:"end"`
}

// parseRgJSON parses a single JSON line from ripgrep output and returns a SearchResult.
// Returns nil for non-match lines (e.g. "begin", "end", "summary").
func parseRgJSON(line []byte) *SearchResult {
	var entry rgJSON
	if err := json.Unmarshal(line, &entry); err != nil {
		return nil
	}

	if entry.Type != "match" {
		return nil
	}

	var data rgMatchData
	if err := json.Unmarshal(entry.Data, &data); err != nil {
		return nil
	}

	result := &SearchResult{
		FilePath:   data.Path.Text,
		LineNumber: data.LineNumber,
		LineText:   strings.TrimRight(data.Lines.Text, "\n"),
	}

	if len(data.Submatches) > 0 {
		result.MatchText = data.Submatches[0].Match.Text
		result.Column = data.Submatches[0].Start + 1 // 1-based column
	}

	return result
}

// Search performs a synchronous search and returns all results at once.
// rg exits with code 1 when no matches are found — this is treated as success with empty results.
func (s *Service) Search(opts SearchOptions) ([]SearchResult, error) {
	if s.rgPath == "" {
		return nil, fmt.Errorf("ripgrep (rg) not found")
	}

	if opts.Query == "" {
		return []SearchResult{}, nil
	}

	args := s.buildArgs(opts)
	cmd := exec.Command(s.rgPath, args...)

	output, err := cmd.Output()
	if err != nil {
		// rg exits with code 1 when no matches found — not an error
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return []SearchResult{}, nil
		}
		return nil, fmt.Errorf("ripgrep failed: %w", err)
	}

	var results []SearchResult
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		result := parseRgJSON(scanner.Bytes())
		if result != nil {
			results = append(results, *result)
			if opts.MaxResults > 0 && len(results) >= opts.MaxResults {
				break
			}
		}
	}

	return results, nil
}

// SearchStream performs a streaming search, emitting results as they arrive via Wails events.
// It emits "search:result" for each match and "search:done" when complete.
func (s *Service) SearchStream(opts SearchOptions) error {
	if s.rgPath == "" {
		return fmt.Errorf("ripgrep (rg) not found")
	}

	if opts.Query == "" {
		if s.ctx != nil {
			wailsRuntime.EventsEmit(s.ctx, "search:done", nil)
		}
		return nil
	}

	args := s.buildArgs(opts)
	cmd := exec.Command(s.rgPath, args...)

	s.mu.Lock()
	s.activeCmd = cmd
	s.mu.Unlock()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		s.mu.Lock()
		s.activeCmd = nil
		s.mu.Unlock()
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		s.mu.Lock()
		s.activeCmd = nil
		s.mu.Unlock()
		return fmt.Errorf("failed to start ripgrep: %w", err)
	}

	scanner := bufio.NewScanner(stdout)
	count := 0
	for scanner.Scan() {
		result := parseRgJSON(scanner.Bytes())
		if result != nil {
			if s.ctx != nil {
				wailsRuntime.EventsEmit(s.ctx, "search:result", result)
			}
			count++
			if opts.MaxResults > 0 && count >= opts.MaxResults {
				break
			}
		}
	}

	// Wait for the process to finish
	waitErr := cmd.Wait()

	s.mu.Lock()
	s.activeCmd = nil
	s.mu.Unlock()

	if s.ctx != nil {
		wailsRuntime.EventsEmit(s.ctx, "search:done", nil)
	}

	// rg exits with code 1 when no matches found — not an error
	if waitErr != nil {
		if exitErr, ok := waitErr.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return nil
		}
		// If the process was killed (e.g. via CancelSearch), don't report as error
		if exitErr, ok := waitErr.(*exec.ExitError); ok && exitErr.ExitCode() == -1 {
			return nil
		}
	}

	return nil
}

// CancelSearch cancels the currently running streaming search, if any.
func (s *Service) CancelSearch() error {
	s.mu.Lock()
	cmd := s.activeCmd
	s.mu.Unlock()

	if cmd == nil {
		return nil
	}

	if cmd.Process != nil {
		return cmd.Process.Kill()
	}

	return nil
}

// Replace finds all matches using Search and performs text replacement in the matching files.
// Returns the number of files modified.
func (s *Service) Replace(opts ReplaceOptions) (int, error) {
	results, err := s.Search(opts.SearchOptions)
	if err != nil {
		return 0, err
	}

	// Group results by file path
	fileSet := make(map[string]bool)
	for _, r := range results {
		fileSet[r.FilePath] = true
	}

	modifiedCount := 0
	for filePath := range fileSet {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return modifiedCount, fmt.Errorf("failed to read %s: %w", filePath, err)
		}

		original := string(content)
		var replaced string

		if opts.IsRegex {
			var re *regexp.Regexp
			if opts.CaseSensitive {
				re, err = regexp.Compile(opts.Query)
			} else {
				re, err = regexp.Compile("(?i)" + opts.Query)
			}
			if err != nil {
				return modifiedCount, fmt.Errorf("invalid regex %q: %w", opts.Query, err)
			}
			replaced = re.ReplaceAllString(original, opts.ReplaceText)
		} else {
			if opts.CaseSensitive {
				replaced = strings.ReplaceAll(original, opts.Query, opts.ReplaceText)
			} else {
				// Case-insensitive string replacement
				re, err := regexp.Compile("(?i)" + regexp.QuoteMeta(opts.Query))
				if err != nil {
					return modifiedCount, fmt.Errorf("failed to compile pattern: %w", err)
				}
				replaced = re.ReplaceAllString(original, opts.ReplaceText)
			}
		}

		if replaced != original {
			if err := os.WriteFile(filePath, []byte(replaced), 0644); err != nil {
				return modifiedCount, fmt.Errorf("failed to write %s: %w", filePath, err)
			}
			modifiedCount++
		}
	}

	return modifiedCount, nil
}
