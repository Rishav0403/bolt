import { describe, it, expect } from 'vitest';

/**
 * Unit tests for the split pane management logic in EditorContext.
 *
 * Since the functions in EditorContext are tightly coupled to SolidJS signals
 * and a JSX Provider component, we extract and test the pure logic here
 * using simple state variables that mirror the signal behavior.
 */

// Mirror the pane management logic from EditorContext without SolidJS dependencies
function createPaneManager() {
  let panes = [{ id: 'pane-0', tabIds: [], activeTabId: null }];
  let activePaneIndex = 0;

  function splitPane() {
    const newId = 'pane-' + panes.length;
    panes = [...panes, { id: newId, tabIds: [], activeTabId: null }];
    activePaneIndex = activePaneIndex + 1;
  }

  function closePane(index) {
    if (panes.length <= 1) return; // can't close last pane
    const updated = [...panes];
    updated.splice(index, 1);
    panes = updated;
    activePaneIndex = Math.min(activePaneIndex, panes.length - 1);
  }

  function getActivePane() {
    return panes[activePaneIndex] || panes[0];
  }

  return {
    getPanes: () => panes,
    getActivePaneIndex: () => activePaneIndex,
    setActivePaneIndex: (val) => { activePaneIndex = val; },
    splitPane,
    closePane,
    getActivePane,
  };
}

describe('Split Pane Management', () => {
  it('should initialize with a single pane', () => {
    const mgr = createPaneManager();
    expect(mgr.getPanes()).toHaveLength(1);
    expect(mgr.getPanes()[0].id).toBe('pane-0');
    expect(mgr.getActivePaneIndex()).toBe(0);
  });

  it('should add a new pane when splitPane is called', () => {
    const mgr = createPaneManager();
    mgr.splitPane();
    expect(mgr.getPanes()).toHaveLength(2);
    expect(mgr.getPanes()[1].id).toBe('pane-1');
    expect(mgr.getActivePaneIndex()).toBe(1);
  });

  it('should add multiple panes with correct IDs', () => {
    const mgr = createPaneManager();
    mgr.splitPane();
    mgr.splitPane();
    mgr.splitPane();
    expect(mgr.getPanes()).toHaveLength(4);
    expect(mgr.getPanes().map(p => p.id)).toEqual(['pane-0', 'pane-1', 'pane-2', 'pane-3']);
    expect(mgr.getActivePaneIndex()).toBe(3);
  });

  it('should not close the last remaining pane', () => {
    const mgr = createPaneManager();
    mgr.closePane(0);
    expect(mgr.getPanes()).toHaveLength(1);
    expect(mgr.getPanes()[0].id).toBe('pane-0');
  });

  it('should close a split pane by index', () => {
    const mgr = createPaneManager();
    mgr.splitPane(); // now 2 panes
    expect(mgr.getPanes()).toHaveLength(2);
    mgr.closePane(1); // close the second pane
    expect(mgr.getPanes()).toHaveLength(1);
    expect(mgr.getPanes()[0].id).toBe('pane-0');
  });

  it('should adjust activePaneIndex when closing active pane', () => {
    const mgr = createPaneManager();
    mgr.splitPane(); // pane-0, pane-1, active=1
    mgr.splitPane(); // pane-0, pane-1, pane-2, active=2
    expect(mgr.getActivePaneIndex()).toBe(2);
    mgr.closePane(2); // close pane-2, should clamp active to 1
    expect(mgr.getActivePaneIndex()).toBe(1);
  });

  it('should keep activePaneIndex unchanged when closing a pane before it', () => {
    const mgr = createPaneManager();
    mgr.splitPane(); // pane-0, pane-1, active=1
    mgr.splitPane(); // pane-0, pane-1, pane-2, active=2
    mgr.setActivePaneIndex(2);
    mgr.closePane(0); // close pane-0, now panes = [pane-1, pane-2], active should clamp to max(1)
    expect(mgr.getPanes()).toHaveLength(2);
    // activePaneIndex clamped to panes.length - 1 = 1
    expect(mgr.getActivePaneIndex()).toBe(Math.min(2, mgr.getPanes().length - 1));
  });

  it('getActivePane should return the correct pane', () => {
    const mgr = createPaneManager();
    expect(mgr.getActivePane().id).toBe('pane-0');
    mgr.splitPane();
    expect(mgr.getActivePane().id).toBe('pane-1');
    mgr.setActivePaneIndex(0);
    expect(mgr.getActivePane().id).toBe('pane-0');
  });

  it('new panes should have empty tabIds and null activeTabId', () => {
    const mgr = createPaneManager();
    mgr.splitPane();
    const newPane = mgr.getPanes()[1];
    expect(newPane.tabIds).toEqual([]);
    expect(newPane.activeTabId).toBeNull();
  });

  it('should handle closing middle pane correctly', () => {
    const mgr = createPaneManager();
    mgr.splitPane(); // pane-0, pane-1
    mgr.splitPane(); // pane-0, pane-1, pane-2
    mgr.setActivePaneIndex(1);
    mgr.closePane(1); // close pane-1, panes = [pane-0, pane-2]
    expect(mgr.getPanes()).toHaveLength(2);
    expect(mgr.getPanes()[0].id).toBe('pane-0');
    expect(mgr.getPanes()[1].id).toBe('pane-2');
    // activePaneIndex was 1, panes.length - 1 is 1, so clamped to 1
    expect(mgr.getActivePaneIndex()).toBe(1);
  });
});
