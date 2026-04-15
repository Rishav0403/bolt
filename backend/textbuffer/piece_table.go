package textbuffer

import "strings"

type bufferKind int

const (
	originalBuf bufferKind = iota
	addedBuf
)

// piece is a pointer into one of the two backing buffers.
type piece struct {
	buf    bufferKind
	start  int // byte offset into the buffer
	length int // byte length of this piece
}

// PieceTable is the core text buffer. It is not safe for concurrent use;
// callers must synchronise access (the Service wrapper uses a mutex).
type PieceTable struct {
	original []byte
	added    []byte
	pieces   []piece
}

// New returns a PieceTable pre-populated with content.
func New(content string) *PieceTable {
	pt := &PieceTable{
		original: []byte(content),
		added:    []byte{},
	}
	if len(content) > 0 {
		pt.pieces = []piece{{buf: originalBuf, start: 0, length: len(content)}}
	}
	return pt
}

// buf returns the backing byte slice for a piece.
func (pt *PieceTable) bufOf(p piece) []byte {
	if p.buf == originalBuf {
		return pt.original
	}
	return pt.added
}

// pieceAt maps a logical byte offset to (pieceIndex, offsetWithinPiece).
// If offset equals the total document length, it returns (len(pieces), 0)
// to indicate an append-at-end position.
func (pt *PieceTable) pieceAt(offset int) (idx int, inPiece int) {
	pos := 0
	for i, p := range pt.pieces {
		if pos+p.length > offset {
			return i, offset - pos
		}
		pos += p.length
	}
	return len(pt.pieces), 0
}

// Insert splices text into the document at the given logical byte offset.
func (pt *PieceTable) Insert(offset int, text string) {
	if len(text) == 0 {
		return
	}

	// Append to the added buffer; record the new piece.
	addStart := len(pt.added)
	pt.added = append(pt.added, text...)
	np := piece{buf: addedBuf, start: addStart, length: len(text)}

	idx, inPiece := pt.pieceAt(offset)

	switch {
	case idx == len(pt.pieces):
		// Append at end of document.
		pt.pieces = append(pt.pieces, np)

	case inPiece == 0:
		// Insert before piece idx — no split needed.
		pt.pieces = sliceInsert(pt.pieces, idx, np)

	default:
		// Split piece idx at inPiece, inserting np in the gap.
		orig := pt.pieces[idx]
		left := piece{buf: orig.buf, start: orig.start, length: inPiece}
		right := piece{buf: orig.buf, start: orig.start + inPiece, length: orig.length - inPiece}

		tail := make([]piece, len(pt.pieces[idx+1:]))
		copy(tail, pt.pieces[idx+1:])
		pt.pieces = append(pt.pieces[:idx], left, np, right)
		pt.pieces = append(pt.pieces, tail...)
	}
}

// Delete removes length bytes starting at the given logical byte offset.
func (pt *PieceTable) Delete(offset, length int) {
	if length <= 0 {
		return
	}

	end := offset + length
	var next []piece
	pos := 0

	for _, p := range pt.pieces {
		pEnd := pos + p.length

		if pEnd <= offset || pos >= end {
			// Piece is entirely outside the deleted range — keep it.
			next = append(next, p)
		} else if pos >= offset && pEnd <= end {
			// Piece is entirely inside the deleted range — drop it.
		} else {
			// Piece partially overlaps — keep the portion(s) outside the range.
			if pos < offset {
				next = append(next, piece{buf: p.buf, start: p.start, length: offset - pos})
			}
			if pEnd > end {
				skip := end - pos
				next = append(next, piece{buf: p.buf, start: p.start + skip, length: pEnd - end})
			}
		}

		pos = pEnd
	}

	pt.pieces = next
}

// GetContent reconstructs the full document text by concatenating all pieces.
func (pt *PieceTable) GetContent() string {
	if len(pt.pieces) == 0 {
		return ""
	}

	// Pre-calculate total length to avoid repeated allocations.
	total := 0
	for _, p := range pt.pieces {
		total += p.length
	}

	out := make([]byte, 0, total)
	for _, p := range pt.pieces {
		buf := pt.bufOf(p)
		out = append(out, buf[p.start:p.start+p.length]...)
	}
	return string(out)
}

// Length returns the document length in bytes.
func (pt *PieceTable) Length() int {
	n := 0
	for _, p := range pt.pieces {
		n += p.length
	}
	return n
}

// LineCount returns the number of lines (newline-separated) in the document.
// An empty document counts as 1 line.
func (pt *PieceTable) LineCount() int {
	count := 1
	for _, p := range pt.pieces {
		buf := pt.bufOf(p)
		for _, b := range buf[p.start : p.start+p.length] {
			if b == '\n' {
				count++
			}
		}
	}
	return count
}

// GetLines returns the 1-indexed lines [start, end).
// end=0 means "through end of document".
// Line indices are clamped to the valid range.
func (pt *PieceTable) GetLines(start, end int) []string {
	content := pt.GetContent()
	lines := strings.Split(content, "\n")

	if start < 1 {
		start = 1
	}
	if end <= 0 || end > len(lines)+1 {
		end = len(lines) + 1
	}
	if start > len(lines) {
		return nil
	}
	return lines[start-1 : end-1]
}

// sliceInsert inserts v at index i in s, returning the extended slice.
func sliceInsert(s []piece, i int, v piece) []piece {
	s = append(s, piece{})
	copy(s[i+1:], s[i:])
	s[i] = v
	return s
}
