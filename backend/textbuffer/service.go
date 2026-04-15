package textbuffer

import (
	"fmt"
	"sync"
)

// BufferInfo carries metadata about an open buffer, returned to the frontend.
type BufferInfo struct {
	ID        string `json:"id"`
	LineCount int    `json:"lineCount"`
	Length    int    `json:"length"`
}

// Service manages a collection of PieceTable instances, one per open file.
// Its public methods are exposed to the SolidJS frontend via Wails bindings.
// A RWMutex protects the buffers map; individual PieceTable operations are
// serialised through the write lock so no additional locking is needed inside
// PieceTable itself.
type Service struct {
	mu      sync.RWMutex
	buffers map[string]*PieceTable
}

// NewService returns an initialised Service ready for use.
func NewService() *Service {
	return &Service{buffers: make(map[string]*PieceTable)}
}

// OpenBuffer creates (or replaces) a piece-table buffer identified by id.
// id is typically the absolute file path. content is the initial file text.
func (s *Service) OpenBuffer(id, content string) BufferInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	pt := New(content)
	s.buffers[id] = pt
	return BufferInfo{ID: id, LineCount: pt.LineCount(), Length: pt.Length()}
}

// CloseBuffer removes the buffer for id, freeing its memory.
func (s *Service) CloseBuffer(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.buffers, id)
}

// Insert splices text into the buffer at the given logical byte offset.
func (s *Service) Insert(id string, offset int, text string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pt, ok := s.buffers[id]
	if !ok {
		return fmt.Errorf("textbuffer: buffer not found: %s", id)
	}
	pt.Insert(offset, text)
	return nil
}

// Delete removes length bytes from the buffer starting at offset.
func (s *Service) Delete(id string, offset, length int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	pt, ok := s.buffers[id]
	if !ok {
		return fmt.Errorf("textbuffer: buffer not found: %s", id)
	}
	pt.Delete(offset, length)
	return nil
}

// GetContent returns the full reconstructed text of the buffer.
func (s *Service) GetContent(id string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pt, ok := s.buffers[id]
	if !ok {
		return "", fmt.Errorf("textbuffer: buffer not found: %s", id)
	}
	return pt.GetContent(), nil
}

// GetLines returns lines [start, end) from the buffer (1-indexed, end exclusive).
// Pass end=0 to read from start through the last line.
func (s *Service) GetLines(id string, start, end int) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pt, ok := s.buffers[id]
	if !ok {
		return nil, fmt.Errorf("textbuffer: buffer not found: %s", id)
	}
	return pt.GetLines(start, end), nil
}

// LineCount returns the number of lines in the buffer.
func (s *Service) LineCount(id string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pt, ok := s.buffers[id]
	if !ok {
		return 0, fmt.Errorf("textbuffer: buffer not found: %s", id)
	}
	return pt.LineCount(), nil
}

// Stats returns metadata for every open buffer.
func (s *Service) Stats() []BufferInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]BufferInfo, 0, len(s.buffers))
	for id, pt := range s.buffers {
		result = append(result, BufferInfo{
			ID:        id,
			LineCount: pt.LineCount(),
			Length:    pt.Length(),
		})
	}
	return result
}
