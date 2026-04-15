package fs

// FileEntry represents a file or directory in the file tree.
type FileEntry struct {
	Name      string      `json:"name"`
	Path      string      `json:"path"`
	IsDir     bool        `json:"isDir"`
	Extension string      `json:"extension"`
	Children  []FileEntry `json:"children,omitempty"`
}
