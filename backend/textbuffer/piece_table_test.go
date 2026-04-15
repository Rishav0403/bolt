package textbuffer

import (
	"strings"
	"testing"
)

// ── Construction ──────────────────────────────────────────────────────────────

func TestNew_empty(t *testing.T) {
	pt := New("")
	assertContent(t, pt, "")
}

func TestNew_content(t *testing.T) {
	pt := New("hello world")
	assertContent(t, pt, "hello world")
}

// ── Insert ────────────────────────────────────────────────────────────────────

func TestInsert_atStart(t *testing.T) {
	pt := New("world")
	pt.Insert(0, "hello ")
	assertContent(t, pt, "hello world")
}

func TestInsert_atEnd(t *testing.T) {
	pt := New("hello")
	pt.Insert(5, " world")
	assertContent(t, pt, "hello world")
}

func TestInsert_middle(t *testing.T) {
	pt := New("hello world")
	pt.Insert(5, " beautiful")
	assertContent(t, pt, "hello beautiful world")
}

func TestInsert_intoEmpty(t *testing.T) {
	pt := New("")
	pt.Insert(0, "hi")
	assertContent(t, pt, "hi")
}

func TestInsert_multipleSequential(t *testing.T) {
	pt := New("ac")
	pt.Insert(1, "b") // "abc"
	pt.Insert(3, "d") // "abcd"
	assertContent(t, pt, "abcd")
}

func TestInsert_atPieceBoundary(t *testing.T) {
	pt := New("ab")
	pt.Insert(1, "X") // split original piece at index 1 → "aXb"
	pt.Insert(2, "Y") // insert into the added-buffer piece at boundary → "aXYb"
	assertContent(t, pt, "aXYb")
}

// ── Delete ────────────────────────────────────────────────────────────────────

func TestDelete_all(t *testing.T) {
	pt := New("hello")
	pt.Delete(0, 5)
	assertContent(t, pt, "")
}

func TestDelete_fromStart(t *testing.T) {
	pt := New("hello world")
	pt.Delete(0, 6) // remove "hello "
	assertContent(t, pt, "world")
}

func TestDelete_fromEnd(t *testing.T) {
	pt := New("hello world")
	pt.Delete(5, 6) // remove " world"
	assertContent(t, pt, "hello")
}

func TestDelete_middle(t *testing.T) {
	pt := New("hello beautiful world")
	pt.Delete(5, 10) // remove " beautiful"
	assertContent(t, pt, "hello world")
}

func TestDelete_spanningMultiplePieces(t *testing.T) {
	pt := New("hello world")
	pt.Insert(5, " beautiful") // "hello beautiful world" — now 3 pieces
	pt.Delete(5, 10)           // remove " beautiful" — back to "hello world"
	assertContent(t, pt, "hello world")
}

func TestDelete_zero(t *testing.T) {
	pt := New("hello")
	pt.Delete(0, 0)
	assertContent(t, pt, "hello")
}

// ── Combined operations ───────────────────────────────────────────────────────

func TestInsertThenDelete(t *testing.T) {
	pt := New("hello world")
	pt.Insert(5, " beautiful")
	assertContent(t, pt, "hello beautiful world")
	pt.Delete(5, 10)
	assertContent(t, pt, "hello world")
}

func TestDelete_thenInsert(t *testing.T) {
	pt := New("hello world")
	pt.Delete(5, 6)           // "hello"
	pt.Insert(5, ", planet!") // "hello, planet!"
	assertContent(t, pt, "hello, planet!")
}

func TestManyEdits(t *testing.T) {
	pt := New("the quick brown fox")
	pt.Delete(4, 6)         // remove "quick " → "the brown fox"
	pt.Insert(4, "slow ")   // "the slow brown fox"
	pt.Delete(14, 4)        // remove " fox" → "the slow brown"
	pt.Insert(14, " cat")   // "the slow brown cat"
	assertContent(t, pt, "the slow brown cat")
}

// ── Line helpers ──────────────────────────────────────────────────────────────

func TestLineCount_single(t *testing.T) {
	pt := New("hello")
	if got := pt.LineCount(); got != 1 {
		t.Errorf("LineCount = %d, want 1", got)
	}
}

func TestLineCount_multiple(t *testing.T) {
	pt := New("line1\nline2\nline3")
	if got := pt.LineCount(); got != 3 {
		t.Errorf("LineCount = %d, want 3", got)
	}
}

func TestLineCount_empty(t *testing.T) {
	pt := New("")
	if got := pt.LineCount(); got != 1 {
		t.Errorf("LineCount = %d, want 1", got)
	}
}

func TestGetLines_range(t *testing.T) {
	pt := New("line1\nline2\nline3\nline4")
	lines := pt.GetLines(2, 4)
	want := []string{"line2", "line3"}
	if !stringSliceEqual(lines, want) {
		t.Errorf("GetLines(2,4) = %v, want %v", lines, want)
	}
}

func TestGetLines_all(t *testing.T) {
	content := "a\nb\nc"
	pt := New(content)
	lines := pt.GetLines(1, 0)
	want := strings.Split(content, "\n")
	if !stringSliceEqual(lines, want) {
		t.Errorf("GetLines(1,0) = %v, want %v", lines, want)
	}
}

func TestGetLines_singleLine(t *testing.T) {
	pt := New("only")
	lines := pt.GetLines(1, 2)
	want := []string{"only"}
	if !stringSliceEqual(lines, want) {
		t.Errorf("GetLines(1,2) = %v, want %v", lines, want)
	}
}

// ── Length ────────────────────────────────────────────────────────────────────

func TestLength(t *testing.T) {
	pt := New("hello")
	if got := pt.Length(); got != 5 {
		t.Errorf("Length = %d, want 5", got)
	}
	pt.Insert(5, " world")
	if got := pt.Length(); got != 11 {
		t.Errorf("Length after insert = %d, want 11", got)
	}
	pt.Delete(0, 6)
	if got := pt.Length(); got != 5 {
		t.Errorf("Length after delete = %d, want 5", got)
	}
}

// ── Service ───────────────────────────────────────────────────────────────────

func TestService_openAndGet(t *testing.T) {
	svc := NewService()
	info := svc.OpenBuffer("file1", "hello world")
	if info.ID != "file1" {
		t.Errorf("info.ID = %q, want file1", info.ID)
	}
	if info.LineCount != 1 {
		t.Errorf("info.LineCount = %d, want 1", info.LineCount)
	}

	got, err := svc.GetContent("file1")
	if err != nil {
		t.Fatalf("GetContent error: %v", err)
	}
	if got != "hello world" {
		t.Errorf("GetContent = %q, want %q", got, "hello world")
	}
}

func TestService_insertDelete(t *testing.T) {
	svc := NewService()
	svc.OpenBuffer("f", "hello world")

	if err := svc.Insert("f", 5, " beautiful"); err != nil {
		t.Fatalf("Insert: %v", err)
	}
	got, _ := svc.GetContent("f")
	if got != "hello beautiful world" {
		t.Errorf("after insert: %q", got)
	}

	if err := svc.Delete("f", 5, 10); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	got, _ = svc.GetContent("f")
	if got != "hello world" {
		t.Errorf("after delete: %q", got)
	}
}

func TestService_notFound(t *testing.T) {
	svc := NewService()
	if _, err := svc.GetContent("missing"); err == nil {
		t.Error("expected error for missing buffer")
	}
	if err := svc.Insert("missing", 0, "x"); err == nil {
		t.Error("expected error for missing buffer")
	}
	if err := svc.Delete("missing", 0, 1); err == nil {
		t.Error("expected error for missing buffer")
	}
}

func TestService_close(t *testing.T) {
	svc := NewService()
	svc.OpenBuffer("f", "data")
	svc.CloseBuffer("f")
	if _, err := svc.GetContent("f"); err == nil {
		t.Error("expected error after CloseBuffer")
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func assertContent(t *testing.T, pt *PieceTable, want string) {
	t.Helper()
	if got := pt.GetContent(); got != want {
		t.Errorf("GetContent() = %q, want %q", got, want)
	}
}

func stringSliceEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
