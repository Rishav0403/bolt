import { createSignal, createEffect, Show, For, onCleanup } from 'solid-js';
import { useEditor } from '../contexts/EditorContext';
import { getWailsSearch, getWailsFs } from '../utils/wails';
import { DEMO_CONTENTS } from '../utils/demoData';
import { baseName } from '../utils/pathUtils';

/**
 * Parse a comma-separated glob string into an array of trimmed, non-empty strings.
 */
function parseGlobs(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Escape HTML special characters so raw text can be safely used with innerHTML.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Highlight the first occurrence of `matchText` within `lineText`.
 * Both values are HTML-escaped first, then the match is wrapped in a <mark>.
 */
function highlightMatch(lineText, matchText) {
  const escapedLine = escapeHtml(lineText);
  const escapedMatch = escapeHtml(matchText);
  const idx = escapedLine.indexOf(escapedMatch);
  if (idx === -1) return escapedLine;
  return (
    escapedLine.substring(0, idx) +
    '<mark class="search-highlight">' +
    escapedMatch +
    '</mark>' +
    escapedLine.substring(idx + escapedMatch.length)
  );
}

/**
 * Search through DEMO_CONTENTS for the given query, respecting caseSensitive flag.
 * Returns flat array of { filePath, lineNumber, column, lineText, matchText }.
 */
function searchDemoContents(query, caseSensitive) {
  const results = [];
  if (!query) return results;

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const [filePath, content] of Object.entries(DEMO_CONTENTS)) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const compareLine = caseSensitive ? line : line.toLowerCase();
      let col = compareLine.indexOf(searchQuery);
      while (col !== -1) {
        results.push({
          filePath,
          lineNumber: i + 1,
          column: col + 1,
          lineText: line,
          matchText: line.substring(col, col + query.length),
        });
        col = compareLine.indexOf(searchQuery, col + 1);
      }
    }
  }
  return results;
}

/**
 * Group a flat array of search results into per-file groups.
 * Returns [{ filePath, fileName, matches: [...] }]
 */
function groupResultsByFile(flatResults) {
  const map = new Map();
  for (const r of flatResults) {
    if (!map.has(r.filePath)) {
      map.set(r.filePath, {
        filePath: r.filePath,
        fileName: baseName(r.filePath),
        matches: [],
      });
    }
    map.get(r.filePath).matches.push({
      lineNumber: r.lineNumber,
      column: r.column,
      lineText: r.lineText,
      matchText: r.matchText,
    });
  }
  return Array.from(map.values());
}

export default function SearchPanel(props) {
  const { openFile } = useEditor();

  // ── Signals ────────────────────────────────────────────────
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal([]);
  const [isSearching, setIsSearching] = createSignal(false);
  const [resultCount, setResultCount] = createSignal(0);
  const [fileCount, setFileCount] = createSignal(0);
  const [isRegex, setIsRegex] = createSignal(false);
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [wholeWord, setWholeWord] = createSignal(false);
  const [showReplace, setShowReplace] = createSignal(false);
  const [replaceText, setReplaceText] = createSignal('');
  const [showFilters, setShowFilters] = createSignal(false);
  const [includeGlobs, setIncludeGlobs] = createSignal('');
  const [excludeGlobs, setExcludeGlobs] = createSignal('');
  const [expandedFiles, setExpandedFiles] = createSignal(new Set());

  // ── Search logic (debounced) ───────────────────────────────
  let debounceTimer;

  createEffect(() => {
    // Track reactive dependencies
    const q = query();
    const regex = isRegex();
    const cs = caseSensitive();
    const ww = wholeWord();

    clearTimeout(debounceTimer);

    if (!q) {
      setResults([]);
      setResultCount(0);
      setFileCount(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimer = setTimeout(() => runSearch(q, regex, cs, ww), 300);
  });

  onCleanup(() => clearTimeout(debounceTimer));

  async function runSearch(q, regex, cs, ww) {
    try {
      const wailsSearch = getWailsSearch();
      let flatResults;

      if (wailsSearch) {
        // Wails mode – call Go backend
        const rootPath = props.rootPath?.() || '';
        if (!rootPath) {
          // No folder open — fall back to demo search or show empty
          flatResults = searchDemoContents(q, cs);
          const grouped = groupResultsByFile(flatResults);
          const allPaths = new Set(grouped.map((g) => g.filePath));
          setExpandedFiles(allPaths);
          const total = grouped.reduce((sum, g) => sum + g.matches.length, 0);
          setResults(grouped);
          setResultCount(total);
          setFileCount(grouped.length);
          setIsSearching(false);
          return;
        }
        const resp = await wailsSearch.Search({
          query: q,
          rootPath,
          isRegex: regex,
          caseSensitive: cs,
          wholeWord: ww,
          includeGlobs: parseGlobs(includeGlobs()),
          excludeGlobs: parseGlobs(excludeGlobs()),
          maxResults: 1000,
        });
        flatResults = resp?.results || resp || [];
      } else {
        // Demo mode – search through DEMO_CONTENTS
        flatResults = searchDemoContents(q, cs);
      }

      const grouped = groupResultsByFile(flatResults);

      // Auto-expand all files in results
      const allPaths = new Set(grouped.map((g) => g.filePath));
      setExpandedFiles(allPaths);

      const total = grouped.reduce((sum, g) => sum + g.matches.length, 0);
      setResults(grouped);
      setResultCount(total);
      setFileCount(grouped.length);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setResultCount(0);
      setFileCount(0);
    } finally {
      setIsSearching(false);
    }
  }

  // ── Replace logic ──────────────────────────────────────────
  async function handleReplaceAll() {
    const q = query();
    const rt = replaceText();
    if (!q) return;

    const wailsSearch = getWailsSearch();
    if (wailsSearch) {
      try {
        await wailsSearch.Replace({
          query: q,
          rootPath: props.rootPath?.() || '',
          isRegex: isRegex(),
          caseSensitive: caseSensitive(),
          wholeWord: wholeWord(),
          includeGlobs: parseGlobs(includeGlobs()),
          excludeGlobs: parseGlobs(excludeGlobs()),
          maxResults: 1000,
          replaceText: rt,
        });
      } catch (err) {
        console.error('Replace error:', err);
      }
    } else {
      // Demo mode: do string replace in DEMO_CONTENTS
      for (const [filePath, content] of Object.entries(DEMO_CONTENTS)) {
        if (caseSensitive()) {
          if (content.includes(q)) {
            DEMO_CONTENTS[filePath] = content.replaceAll(q, rt);
          }
        } else {
          const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          if (re.test(content)) {
            DEMO_CONTENTS[filePath] = content.replace(re, rt);
          }
        }
      }
    }

    // Re-run search to refresh results
    setIsSearching(true);
    await runSearch(q, isRegex(), caseSensitive(), wholeWord());
  }

  // ── Result click handler ───────────────────────────────────
  async function handleResultClick(filePath, match) {
    try {
      let content;
      const wailsFs = getWailsFs();
      if (wailsFs) {
        content = await wailsFs.ReadFile(filePath);
      } else {
        content = DEMO_CONTENTS[filePath] || '';
      }
      openFile(filePath, baseName(filePath), content);
    } catch (err) {
      console.error('Failed to open file from search result:', err);
    }
  }

  // ── File expand/collapse ───────────────────────────────────
  function toggleFileExpand(filePath) {
    const current = expandedFiles();
    const next = new Set(current);
    if (next.has(filePath)) {
      next.delete(filePath);
    } else {
      next.add(filePath);
    }
    setExpandedFiles(next);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div class="search-panel">
      <div class="search-panel-inputs">
        {/* Search input row */}
        <div class="search-input-row">
          <button
            class="search-toggle-replace"
            onClick={() => setShowReplace(!showReplace())}
          >
            {showReplace() ? '▼' : '▶'}
          </button>
          <div class="search-input-wrapper">
            <input
              class="search-input"
              placeholder="Search"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            <div class="search-input-actions">
              <button
                classList={{ active: isRegex() }}
                title="Use Regular Expression"
                onClick={() => setIsRegex(!isRegex())}
              >
                .*
              </button>
              <button
                classList={{ active: caseSensitive() }}
                title="Match Case"
                onClick={() => setCaseSensitive(!caseSensitive())}
              >
                Aa
              </button>
              <button
                classList={{ active: wholeWord() }}
                title="Match Whole Word"
                onClick={() => setWholeWord(!wholeWord())}
              >
                ab|
              </button>
            </div>
          </div>
        </div>

        {/* Replace input row */}
        <Show when={showReplace()}>
          <div class="search-replace-row">
            <input
              class="search-input"
              placeholder="Replace"
              value={replaceText()}
              onInput={(e) => setReplaceText(e.currentTarget.value)}
            />
            <button
              class="search-replace-btn"
              onClick={handleReplaceAll}
              title="Replace All"
            >
              Replace All
            </button>
          </div>
        </Show>

        {/* Filter toggle */}
        <button
          class="search-filter-toggle"
          onClick={() => setShowFilters(!showFilters())}
        >
          {showFilters() ? '▾ Hide filters' : '▸ Files to include/exclude'}
        </button>

        {/* Filter inputs */}
        <Show when={showFilters()}>
          <input
            class="search-filter-input"
            placeholder="files to include (e.g. *.js, src/**)"
            value={includeGlobs()}
            onInput={(e) => setIncludeGlobs(e.currentTarget.value)}
          />
          <input
            class="search-filter-input"
            placeholder="files to exclude (e.g. node_modules)"
            value={excludeGlobs()}
            onInput={(e) => setExcludeGlobs(e.currentTarget.value)}
          />
        </Show>
      </div>

      {/* Results summary */}
      <Show when={query()}>
        <div class="search-results-summary">
          <Show when={isSearching()}>
            <span>Searching...</span>
          </Show>
          <Show when={!isSearching() && resultCount() > 0}>
            <span>
              {resultCount()} results in {fileCount()} files
            </span>
          </Show>
          <Show when={!isSearching() && resultCount() === 0 && query()}>
            <span>No results found</span>
          </Show>
        </div>
      </Show>

      {/* Results list */}
      <div class="search-results">
        <For each={results()}>
          {(fileGroup) => (
            <div class="search-result-file">
              <div
                class="search-result-file-header"
                onClick={() => toggleFileExpand(fileGroup.filePath)}
              >
                <span class="search-result-chevron">
                  {expandedFiles().has(fileGroup.filePath) ? '▼' : '▶'}
                </span>
                <span class="search-result-filename">
                  {fileGroup.fileName}
                </span>
                <span class="search-result-filepath">
                  {fileGroup.filePath}
                </span>
                <span class="search-result-count">
                  {fileGroup.matches.length}
                </span>
              </div>
              <Show when={expandedFiles().has(fileGroup.filePath)}>
                <For each={fileGroup.matches}>
                  {(match) => (
                    <div
                      class="search-result-line"
                      onClick={() =>
                        handleResultClick(fileGroup.filePath, match)
                      }
                    >
                      <span class="search-result-line-number">
                        {match.lineNumber}
                      </span>
                      <span
                        class="search-result-line-text"
                        innerHTML={highlightMatch(
                          match.lineText,
                          match.matchText
                        )}
                      />
                    </div>
                  )}
                </For>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
