/**
 * Bounded undo/redo stack for transaction operations.
 * Entries carry { kind, before, after } snapshots that callers use to
 * reconstruct the previous state.
 */

export const DEFAULT_UNDO_CAPACITY = 50

/**
 * Reverses an entry on the transactions list.
 * Kinds:
 *   add     { kind:'add', tx, index }            insert at index
 *   addMany { kind:'addMany', txs }              insert at front
 *   delete  { kind:'delete', tx, index }         remove tx
 *   deleteMany { kind:'deleteMany', txs:[{tx,index}] } remove all, restore
 *                                                at original positions on undo
 *   update  { kind:'update', id, before, after } replace with before/after
 *   updateMany { kind:'updateMany', changes:[{id,before,after}] } apply all
 *   merge   { kind:'merge', id, dupTx, index, before, after }
 *                                                merge dupTx into id (after),
 *                                                restoring both on undo
 */
export function applyUndoEntry(entry, transactions) {
  if (!entry || !Array.isArray(transactions)) return transactions
  switch (entry.kind) {
    case 'add':
      return transactions.filter((t) => t.id !== entry.tx?.id)
    case 'addMany': {
      const ids = new Set((entry.txs || []).map((t) => t.id))
      return transactions.filter((t) => !ids.has(t.id))
    }
    case 'delete': {
      const tx = entry.tx
      if (!tx) return transactions
      const idx = Math.max(0, Math.min(entry.index ?? 0, transactions.length))
      const clone = transactions.slice()
      clone.splice(idx, 0, tx)
      return clone
    }
    case 'deleteMany': {
      const clone = transactions.slice()
      const entries = (entry.txs || [])
        .filter((e) => e && e.tx)
        .sort((a, b) => a.index - b.index)
      for (const e of entries) {
        const idx = Math.max(0, Math.min(e.index ?? clone.length, clone.length))
        clone.splice(idx, 0, e.tx)
      }
      return clone
    }
    case 'update':
      return transactions.map((t) => (t.id === entry.id ? entry.before : t))
    case 'updateMany': {
      const map = new Map((entry.changes || []).map((c) => [c.id, c.before]))
      if (map.size === 0) return transactions
      return transactions.map((t) => (map.has(t.id) ? map.get(t.id) : t))
    }
    case 'merge': {
      const clone = transactions
        .filter((t) => t.id !== entry.dupTx?.id)
        .map((t) => (t.id === entry.id ? entry.before : t))
      const idx = Math.max(0, Math.min(entry.index ?? 0, clone.length))
      clone.splice(idx, 0, entry.dupTx)
      return clone
    }
    default:
      return transactions
  }
}

/**
 * Re-applies an entry that was previously undone.
 */
export function applyRedoEntry(entry, transactions) {
  if (!entry || !Array.isArray(transactions)) return transactions
  switch (entry.kind) {
    case 'add': {
      const tx = entry.tx
      if (!tx) return transactions
      const idx = Math.max(0, Math.min(entry.index ?? 0, transactions.length))
      const clone = transactions.slice()
      clone.splice(idx, 0, tx)
      return clone
    }
    case 'addMany':
      return [...(entry.txs || []), ...transactions]
    case 'delete':
      return transactions.filter((t) => t.id !== entry.tx?.id)
    case 'deleteMany': {
      const ids = new Set((entry.txs || []).map((e) => e.tx?.id).filter(Boolean))
      return transactions.filter((t) => !ids.has(t.id))
    }
    case 'update':
      return transactions.map((t) => (t.id === entry.id ? entry.after : t))
    case 'updateMany': {
      const map = new Map((entry.changes || []).map((c) => [c.id, c.after]))
      if (map.size === 0) return transactions
      return transactions.map((t) => (map.has(t.id) ? map.get(t.id) : t))
    }
    case 'merge':
      return transactions
        .filter((t) => t.id !== entry.dupTx?.id)
        .map((t) => (t.id === entry.id ? entry.after : t))
    default:
      return transactions
  }
}

export function createUndoStack(options = {}) {
  const capacity = options.capacity || DEFAULT_UNDO_CAPACITY
  const undo = []
  const redo = []
  return {
    get undoSize() { return undo.length },
    get redoSize() { return redo.length },
    get canUndo() { return undo.length > 0 },
    get canRedo() { return redo.length > 0 },
    peekUndo() { return undo.length ? undo[undo.length - 1] : null },
    peekRedo() { return redo.length ? redo[redo.length - 1] : null },
    push(entry) {
      undo.push(entry)
      if (undo.length > capacity) undo.shift()
      redo.length = 0
    },
    pushRedo(entry) {
      redo.push(entry)
      if (redo.length > capacity) redo.shift()
    },
    popUndo() {
      return undo.length ? undo.pop() : null
    },
    popRedo() {
      return redo.length ? redo.pop() : null
    },
    clear() {
      undo.length = 0
      redo.length = 0
    },
  }
}