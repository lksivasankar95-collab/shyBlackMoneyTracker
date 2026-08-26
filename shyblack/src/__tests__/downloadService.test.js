import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @capacitor/core so we can simulate the Android native platform.
const pluginMock = {
  saveToDownloads: vi.fn(async (opts) => ({
    uri: `content://media/external/downloads/${encodeURIComponent(opts.fileName)}`,
    displayName: opts.fileName,
    path: `Download/Expenses Tracker ShyBlack/${opts.fileName}`,
    size: 1024,
  })),
  openFile: vi.fn(async () => {}),
}

vi.mock('@capacitor/core', () => ({
  registerPlugin: vi.fn(() => pluginMock),
  Capacitor: {
    getPlatform: () => mockPlatform,
    isNativePlatform: () => mockPlatform === 'android',
  },
}))

let mockPlatform = 'android'

const ds = await import('../utils/downloadService.js')

describe('sanitizeFilename', () => {
  it('removes invalid Android filename characters', () => {
    expect(ds.sanitizeFilename('re/port*na?me.pdf')).toBe('re port na me.pdf')
    expect(ds.sanitizeFilename('a<b>c:d"e|f\\g')).toBe('a b c d e f g')
  })

  it('strips control characters', () => {
    expect(ds.sanitizeFilename('bad\u0000\u001Fname.txt')).toBe('bad name.txt')
  })

  it('trims trailing dots and spaces', () => {
    expect(ds.sanitizeFilename('name. . ')).toBe('name')
    expect(ds.sanitizeFilename('report.')).toBe('report')
  })

  it('collapses whitespace', () => {
    expect(ds.sanitizeFilename('my   report\t file.pdf')).toBe('my report file.pdf')
  })

  it('falls back to "report" for empty or invalid input', () => {
    expect(ds.sanitizeFilename('')).toBe('report')
    expect(ds.sanitizeFilename(null)).toBe('report')
    expect(ds.sanitizeFilename(undefined)).toBe('report')
    expect(ds.sanitizeFilename('///')).toBe('report')
    expect(ds.sanitizeFilename('...')).toBe('report')
  })

  it('caps base length while preserving extension', () => {
    const longName = `${'x'.repeat(300)}.pdf`
    const out = ds.sanitizeFilename(longName)
    expect(out.length).toBeLessThanOrEqual(180 + '.pdf'.length)
    expect(out.endsWith('.pdf')).toBe(true)
  })
})

describe('uniqueFilename collision handling', () => {
  it('returns the desired name when nothing is taken', () => {
    const taken = new Set()
    expect(ds.uniqueFilename('Report.pdf', taken)).toBe('Report.pdf')
  })

  it('appends (1), (2), ... for collisions', () => {
    const taken = new Set(['expense_report_2026-08-23.pdf', 'expense_report_2026-08-23 (1).pdf'])
    const out = ds.uniqueFilename('Expense_Report_2026-08-23.pdf', taken)
    expect(out).toBe('Expense_Report_2026-08-23 (2).pdf')
  })

  it('is case-insensitive when checking collisions', () => {
    const taken = new Set(['report.pdf'])
    expect(ds.uniqueFilename('REPORT.PDF', taken)).toBe('REPORT (1).PDF')
  })
})

describe('buildReportFilename', () => {
  it('builds monthly names like Monthly_Report_2026-08.pdf', () => {
    expect(ds.buildReportFilename('monthly', { month: 7, year: 2026 }, 'pdf'))
      .toBe('Monthly_Report_2026-08.pdf')
  })

  it('builds category names', () => {
    expect(ds.buildReportFilename('category', { month: 11, year: 2025 }, 'pdf'))
      .toBe('Category_Report_2025-12.pdf')
  })

  it('builds annual names', () => {
    expect(ds.buildReportFilename('annual', { month: 3, year: 2026 }, 'pdf'))
      .toBe('Annual_Report_2026.pdf')
  })

  it('builds date-range names', () => {
    expect(ds.buildReportFilename('daterange', { dateFrom: '2026-08-01', dateTo: '2026-08-23' }, 'pdf'))
      .toBe('Expense_Report_2026-08-01_to_2026-08-23.pdf')
  })
})

describe('withSingleFlight double-click protection', () => {
  it('blocks concurrent calls until the first completes', async () => {
    let release
    const gate = new Promise((resolve) => { release = resolve })
    const calls = []
    const guarded = ds.withSingleFlight(async (tag) => {
      calls.push(tag)
      await gate
      return tag
    })

    const first = guarded('a')
    const second = await guarded('b')

    expect(second.blocked).toBe(true)
    release()
    const doneFirst = await first
    expect(doneFirst.blocked).toBe(false)
    expect(doneFirst.result).toBe('a')
    expect(calls).toEqual(['a'])

    // After completion the guard is released.
    const third = await guarded('c')
    expect(third.result).toBe('c')
  })

  it('releases the lock even if the wrapped function throws', async () => {
    const failing = ds.withSingleFlight(async () => { throw new Error('boom') })
    await expect(failing()).rejects.toThrow('boom')

    // Lock must be released after the failure.
    const ok = ds.withSingleFlight(async () => 'ok')
    const r2 = await ok()
    expect(r2.result).toBe('ok')
  })
})

describe('saveToDownloads via MediaStore bridge', () => {
  beforeEach(() => {
    mockPlatform = 'android'
    pluginMock.saveToDownloads.mockClear()
    global.FileReader = class {
      readAsDataURL() {
        this.result = 'data:application/pdf;base64,JVBERi0xLjQ='
        this.onloadend()
      }
    }
  })

  afterEach(() => {
    delete global.FileReader
  })

  it('sends sanitized data to the native plugin and returns a verified result', async () => {
    const result = await ds.saveToDownloads({ type: 'application/pdf' }, 'My Report?.pdf', 'application/pdf')

    expect(pluginMock.saveToDownloads).toHaveBeenCalledTimes(1)
    const args = pluginMock.saveToDownloads.mock.calls[0][0]
    expect(args.fileName).toBe('My Report .pdf')
    expect(args.folder).toBe('Expenses Tracker ShyBlack')
    expect(args.data).toBe('JVBERi0xLjQ=')
    expect(result.success).toBe(true)
    expect(result.path).toBe('Download/Expenses Tracker ShyBlack/My Report .pdf')
    expect(result.size).toBe(1024)
  })

  it('fails loudly when the native save returns an empty size', async () => {
    pluginMock.saveToDownloads.mockResolvedValueOnce({ uri: 'content://x', displayName: 'a.pdf', size: 0 })
    await expect(ds.saveToDownloads({}, 'a.pdf'))
      .rejects.toThrow(/empty/i)
  })

  it('fails loudly when the native save does not return a URI', async () => {
    pluginMock.saveToDownloads.mockResolvedValueOnce({ displayName: 'a.pdf', size: 10 })
    await expect(ds.saveToDownloads({}, 'a.pdf'))
      .rejects.toThrow(/URI/)
  })

  it('propagates native failures as errors (no silent success)', async () => {
    pluginMock.saveToDownloads.mockRejectedValueOnce(new Error('MediaStore rejected the insert'))
    await expect(ds.saveToDownloads({}, 'a.pdf')).rejects.toThrow('MediaStore rejected the insert')
  })
})
