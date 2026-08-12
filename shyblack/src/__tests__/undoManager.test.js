import { describe, it, expect } from 'vitest'
import { createUndoStack, applyUndoEntry, applyRedoEntry } from '../utils/undoManager'

describe('undo stack', () => {
  it('pushes and pops undo entries', () => {
    const stack = createUndoStack()
    stack.push({ kind: 'add', after: { id: '1' } })
    stack.push({ kind: 'delete', before: { id: '2' } })
    expect(stack.undoSize).toBe(2)
    expect(stack.peekUndo()).toEqual({ kind: 'delete', before: { id: '2' } })
    const entry = stack.popUndo()
    expect(entry.kind).toBe('delete')
    expect(stack.undoSize).toBe(1)
  })

  it('clears redo history on new push', () => {
    const stack = createUndoStack()
    stack.push({ kind: 'add', after: { id: '1' } })
    stack.popUndo()
    expect(stack.canRedo).toBe(false)
    stack.push({ kind: 'add', after: { id: '3' } })
    expect(stack.undoSize).toBe(1)
    expect(stack.canRedo).toBe(false)
  })

  it('respects capacity bound', () => {
    const stack = createUndoStack({ capacity: 2 })
    for (let i = 0; i < 5; i++) stack.push({ kind: 'add', after: { id: i } })
    expect(stack.undoSize).toBe(2)
    expect(stack.peekUndo().after.id).toBe(4)
  })

  it('clear resets everything', () => {
    const stack = createUndoStack()
    stack.push({ kind: 'add' })
    stack.clear()
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
    expect(stack.undoSize).toBe(0)
    expect(stack.popUndo()).toBeNull()
    expect(stack.popRedo()).toBeNull()
  })

  it('exposes canUndo/canRedo flags', () => {
    const stack = createUndoStack()
    expect(stack.canUndo).toBe(false)
    stack.push({ kind: 'add' })
    expect(stack.canUndo).toBe(true)
    expect(stack.peekRedo()).toBeNull()
  })

  it('applies undo/redo for add entries', () => {
    const tx = { id: 'a', amount: 10 }
    const list = [{ id: 'b', amount: 5 }]
    expect(applyUndoEntry({ kind: 'add', tx }, list)).toEqual([{ id: 'b', amount: 5 }])
    expect(applyRedoEntry({ kind: 'add', tx, index: 0 }, [{ id: 'b' }])).toEqual([{ id: 'a', amount: 10 }, { id: 'b' }])
    expect(applyRedoEntry({ kind: 'add', tx, index: 1 }, [{ id: 'b' }])).toEqual([{ id: 'b' }, { id: 'a', amount: 10 }])
  })

  it('applies undo/redo for delete entries with position restore', () => {
    const tx = { id: 'a', amount: 10 }
    const entry = { kind: 'delete', tx, index: 1 }
    const after = [{ id: 'x' }, { id: 'y' }]
    const restored = applyUndoEntry(entry, after)
    expect(restored).toEqual([{ id: 'x' }, { id: 'a', amount: 10 }, { id: 'y' }])
    expect(applyRedoEntry(entry, restored)).toEqual(after)
  })

  it('applies undo/redo for update entries', () => {
    const before = { id: 'a', amount: 10 }
    const after = { id: 'a', amount: 99 }
    const entry = { kind: 'update', id: 'a', before, after }
    expect(applyUndoEntry(entry, [after, { id: 'b' }])).toEqual([{ id: 'a', amount: 10 }, { id: 'b' }])
    expect(applyRedoEntry(entry, [before, { id: 'b' }])).toEqual([{ id: 'a', amount: 99 }, { id: 'b' }])
  })

  it('applies undo for addMany entries', () => {
    const txs = [{ id: 'p' }, { id: 'q' }]
    expect(applyUndoEntry({ kind: 'addMany', txs }, [txs[0], txs[1], { id: 'r' }])).toEqual([{ id: 'r' }])
    expect(applyRedoEntry({ kind: 'addMany', txs }, [{ id: 'r' }])).toEqual([{ id: 'p' }, { id: 'q' }, { id: 'r' }])
  })

  it('tolerates bad entries', () => {
    expect(applyUndoEntry(null, [{ id: 'x' }])).toEqual([{ id: 'x' }])
    expect(applyRedoEntry({ kind: 'nope' }, [{ id: 'x' }])).toEqual([{ id: 'x' }])
  })
})