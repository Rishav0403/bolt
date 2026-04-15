package search

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestBuildArgs_defaults(t *testing.T) {
	s := &Service{}
	opts := SearchOptions{
		Query:    "hello",
		RootPath: "/tmp/project",
	}

	args := s.buildArgs(opts)

	expected := []string{
		"--json",
		"--fixed-strings",
		"--ignore-case",
		"--",
		"hello",
		"/tmp/project",
	}

	if len(args) != len(expected) {
		t.Fatalf("expected %d args, got %d: %v", len(expected), len(args), args)
	}

	for i, arg := range expected {
		if args[i] != arg {
			t.Errorf("arg[%d]: expected %q, got %q", i, arg, args[i])
		}
	}
}

func TestBuildArgs_allOptions(t *testing.T) {
	s := &Service{}
	opts := SearchOptions{
		Query:         "foo.*bar",
		RootPath:      "/tmp/project",
		IsRegex:       true,
		CaseSensitive: true,
		WholeWord:     true,
		IncludeGlobs:  []string{"*.go", "*.ts"},
		ExcludeGlobs:  []string{"vendor", "node_modules"},
		MaxResults:    50,
	}

	args := s.buildArgs(opts)

	// Verify key flags are present
	assertContains(t, args, "--json")
	assertContains(t, args, "--case-sensitive")
	assertContains(t, args, "--word-regexp")
	assertContains(t, args, "--max-count")
	assertContains(t, args, "50")

	// --fixed-strings should NOT be present when IsRegex is true
	assertNotContains(t, args, "--fixed-strings")
	// --ignore-case should NOT be present when CaseSensitive is true
	assertNotContains(t, args, "--ignore-case")

	// Check include globs
	assertContainsSequence(t, args, "--glob", "*.go")
	assertContainsSequence(t, args, "--glob", "*.ts")

	// Check exclude globs (negated with !)
	assertContainsSequence(t, args, "--glob", "!vendor")
	assertContainsSequence(t, args, "--glob", "!node_modules")

	// Check separator and trailing args
	lastThree := args[len(args)-3:]
	if lastThree[0] != "--" || lastThree[1] != "foo.*bar" || lastThree[2] != "/tmp/project" {
		t.Errorf("expected trailing args [-- foo.*bar /tmp/project], got %v", lastThree)
	}
}

func TestParseRgJSON_match(t *testing.T) {
	line := `{"type":"match","data":{"path":{"text":"src/main.go"},"lines":{"text":"func main() {\n"},"line_number":10,"submatches":[{"match":{"text":"main"},"start":5,"end":9}]}}`

	result := parseRgJSON([]byte(line))
	if result == nil {
		t.Fatal("expected non-nil result")
	}

	if result.FilePath != "src/main.go" {
		t.Errorf("FilePath: expected %q, got %q", "src/main.go", result.FilePath)
	}
	if result.LineNumber != 10 {
		t.Errorf("LineNumber: expected 10, got %d", result.LineNumber)
	}
	if result.Column != 6 { // start=5 + 1 = 6
		t.Errorf("Column: expected 6, got %d", result.Column)
	}
	if result.LineText != "func main() {" {
		t.Errorf("LineText: expected %q, got %q", "func main() {", result.LineText)
	}
	if result.MatchText != "main" {
		t.Errorf("MatchText: expected %q, got %q", "main", result.MatchText)
	}
}

func TestParseRgJSON_nonMatch(t *testing.T) {
	lines := []string{
		`{"type":"begin","data":{"path":{"text":"src/main.go"}}}`,
		`{"type":"end","data":{"path":{"text":"src/main.go"},"stats":{"elapsed":{"secs":0,"nanos":100}}}}`,
		`{"type":"summary","data":{"elapsed_total":{"secs":0,"nanos":200},"stats":{"matched_lines":1}}}`,
	}

	for _, line := range lines {
		result := parseRgJSON([]byte(line))
		if result != nil {
			t.Errorf("expected nil for type in line %q, got %+v", line, result)
		}
	}
}

func TestParseRgJSON_invalidJSON(t *testing.T) {
	result := parseRgJSON([]byte("not json at all"))
	if result != nil {
		t.Error("expected nil for invalid JSON")
	}
}

// requireRg skips the test if ripgrep is not installed.
func requireRg(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("rg"); err != nil {
		t.Skip("ripgrep not installed")
	}
}

// createTestFiles creates a temp directory with test files and returns the path.
func createTestFiles(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	files := map[string]string{
		"hello.txt":       "Hello World\nThis is a test\nhello again\n",
		"foo.go":          "package main\n\nfunc main() {\n\tfmt.Println(\"Hello\")\n}\n",
		"bar.ts":          "const greeting = 'Hello World';\nconsole.log(greeting);\n",
		"sub/nested.txt":  "nested hello content\nmore text here\n",
		"vendor/skip.txt": "hello in vendor\n",
	}

	for name, content := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}

	return dir
}

func TestSearch_basic(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()
	results, err := svc.Search(SearchOptions{
		Query:    "Hello",
		RootPath: dir,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(results) == 0 {
		t.Fatal("expected at least one result")
	}

	// Verify that results contain the expected match text
	found := false
	for _, r := range results {
		if r.MatchText == "Hello" || r.MatchText == "hello" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected to find a match containing 'Hello' or 'hello', got: %+v", results)
	}
}

func TestSearch_regex(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()
	results, err := svc.Search(SearchOptions{
		Query:    "func\\s+main",
		RootPath: dir,
		IsRegex:  true,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d: %+v", len(results), results)
	}

	if results[0].MatchText != "func main" {
		t.Errorf("expected match text 'func main', got %q", results[0].MatchText)
	}
}

func TestSearch_caseInsensitive(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()

	// Search case-insensitively for "HELLO" — should find all hello/Hello variants
	results, err := svc.Search(SearchOptions{
		Query:         "HELLO",
		RootPath:      dir,
		CaseSensitive: false,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(results) < 2 {
		t.Fatalf("expected at least 2 case-insensitive results, got %d: %+v", len(results), results)
	}

	// Now search case-sensitively for "HELLO" — should find no results
	results, err = svc.Search(SearchOptions{
		Query:         "HELLO",
		RootPath:      dir,
		CaseSensitive: true,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(results) != 0 {
		t.Fatalf("expected 0 case-sensitive results for 'HELLO', got %d: %+v", len(results), results)
	}
}

func TestSearch_wholeWord(t *testing.T) {
	requireRg(t)
	dir := t.TempDir()

	// Create files where "test" appears both as a whole word and as part of another word
	if err := os.WriteFile(filepath.Join(dir, "words.txt"), []byte("this is a test\ntesting things\ntest results\ncontest winner\n"), 0644); err != nil {
		t.Fatal(err)
	}

	svc := NewService()

	// Without whole word
	results, err := svc.Search(SearchOptions{
		Query:         "test",
		RootPath:      dir,
		CaseSensitive: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	allCount := len(results)

	// With whole word — should find fewer matches
	results, err = svc.Search(SearchOptions{
		Query:         "test",
		RootPath:      dir,
		CaseSensitive: true,
		WholeWord:     true,
	})
	if err != nil {
		t.Fatal(err)
	}
	wholeWordCount := len(results)

	if wholeWordCount >= allCount {
		t.Errorf("expected whole-word matches (%d) to be fewer than all matches (%d)", wholeWordCount, allCount)
	}

	// Verify that whole-word results don't include "testing" or "contest"
	for _, r := range results {
		if r.LineText == "testing things" || r.LineText == "contest winner" {
			t.Errorf("whole-word search should not match line: %q", r.LineText)
		}
	}
}

func TestSearch_noMatches(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()
	results, err := svc.Search(SearchOptions{
		Query:    "zzz_nonexistent_pattern_zzz",
		RootPath: dir,
	})
	if err != nil {
		t.Fatalf("expected no error for no-matches search, got: %v", err)
	}

	if len(results) != 0 {
		t.Errorf("expected empty results, got %d: %+v", len(results), results)
	}
}

func TestSearch_emptyQuery(t *testing.T) {
	svc := NewService()
	results, err := svc.Search(SearchOptions{
		Query:    "",
		RootPath: "/tmp",
	})
	if err != nil {
		t.Fatalf("expected no error for empty query, got: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected empty results for empty query, got %d", len(results))
	}
}

func TestSearch_excludeGlobs(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()

	// Search without exclusion first
	allResults, err := svc.Search(SearchOptions{
		Query:    "hello",
		RootPath: dir,
	})
	if err != nil {
		t.Fatal(err)
	}

	// Search with vendor excluded
	filteredResults, err := svc.Search(SearchOptions{
		Query:        "hello",
		RootPath:     dir,
		ExcludeGlobs: []string{"**/vendor/**"},
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(filteredResults) >= len(allResults) {
		t.Errorf("expected fewer results with exclude glob (%d) than without (%d)", len(filteredResults), len(allResults))
	}

	// Verify no results from vendor directory
	for _, r := range filteredResults {
		if filepath.Base(filepath.Dir(r.FilePath)) == "vendor" {
			t.Errorf("result should not include vendor files: %s", r.FilePath)
		}
	}
}

func TestCancelSearch(t *testing.T) {
	requireRg(t)
	dir := createTestFiles(t)

	svc := NewService()

	// Start a SearchStream in a goroutine (ctx is nil so events won't emit)
	done := make(chan error, 1)
	go func() {
		done <- svc.SearchStream(SearchOptions{
			Query:    "hello",
			RootPath: dir,
		})
	}()

	// Immediately cancel — should not panic
	err := svc.CancelSearch()
	if err != nil {
		// It's okay if the process already exited before we could kill it
		t.Logf("CancelSearch returned: %v (may be expected if search finished first)", err)
	}

	// Wait for the stream to finish
	if err := <-done; err != nil {
		t.Logf("SearchStream returned: %v (may be expected after cancel)", err)
	}
}

func TestSearch_maxResults(t *testing.T) {
	requireRg(t)
	dir := t.TempDir()

	// Create a file with many matches
	var content string
	for i := 0; i < 100; i++ {
		content += "match line\n"
	}
	if err := os.WriteFile(filepath.Join(dir, "many.txt"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	svc := NewService()
	results, err := svc.Search(SearchOptions{
		Query:      "match",
		RootPath:   dir,
		MaxResults: 5,
	})
	if err != nil {
		t.Fatal(err)
	}

	if len(results) > 5 {
		t.Errorf("expected at most 5 results, got %d", len(results))
	}
}

func TestSearch_rgNotFound(t *testing.T) {
	svc := &Service{rgPath: ""}
	_, err := svc.Search(SearchOptions{
		Query:    "test",
		RootPath: "/tmp",
	})
	if err == nil {
		t.Fatal("expected error when rg is not found")
	}
	if err.Error() != "ripgrep (rg) not found" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestParseRgJSON_matchRoundTrip(t *testing.T) {
	// Build a realistic ripgrep JSON match line
	matchLine := map[string]interface{}{
		"type": "match",
		"data": map[string]interface{}{
			"path":        map[string]interface{}{"text": "/tmp/test.go"},
			"lines":       map[string]interface{}{"text": "func TestFoo() {\n"},
			"line_number": 42,
			"submatches": []map[string]interface{}{
				{
					"match": map[string]interface{}{"text": "TestFoo"},
					"start": 5,
					"end":   12,
				},
			},
		},
	}
	data, err := json.Marshal(matchLine)
	if err != nil {
		t.Fatal(err)
	}

	result := parseRgJSON(data)
	if result == nil {
		t.Fatal("expected non-nil result")
	}

	if result.FilePath != "/tmp/test.go" {
		t.Errorf("FilePath: expected /tmp/test.go, got %q", result.FilePath)
	}
	if result.LineNumber != 42 {
		t.Errorf("LineNumber: expected 42, got %d", result.LineNumber)
	}
	if result.Column != 6 {
		t.Errorf("Column: expected 6, got %d", result.Column)
	}
	if result.LineText != "func TestFoo() {" {
		t.Errorf("LineText: expected 'func TestFoo() {', got %q", result.LineText)
	}
	if result.MatchText != "TestFoo" {
		t.Errorf("MatchText: expected 'TestFoo', got %q", result.MatchText)
	}
}

// Helper functions

func assertContains(t *testing.T, slice []string, value string) {
	t.Helper()
	for _, s := range slice {
		if s == value {
			return
		}
	}
	t.Errorf("expected slice to contain %q, got %v", value, slice)
}

func assertNotContains(t *testing.T, slice []string, value string) {
	t.Helper()
	for _, s := range slice {
		if s == value {
			t.Errorf("expected slice to NOT contain %q, got %v", value, slice)
			return
		}
	}
}

func assertContainsSequence(t *testing.T, slice []string, first, second string) {
	t.Helper()
	for i := 0; i < len(slice)-1; i++ {
		if slice[i] == first && slice[i+1] == second {
			return
		}
	}
	t.Errorf("expected slice to contain sequence [%q, %q], got %v", first, second, slice)
}
