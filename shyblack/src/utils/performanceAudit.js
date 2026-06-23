import { safeStorage } from './safeStorage'

export function measureStartupTime() {
  const entries = performance.getEntriesByType('navigation')
  if (entries.length > 0) {
    const nav = entries[0]
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      domInteractive: Math.round(nav.domInteractive - nav.startTime),
    }
  }
  const now = performance.now()
  return {
    domContentLoaded: Math.round(now),
    loadComplete: Math.round(now),
    domInteractive: Math.round(now),
  }
}

export function measureStorageReadTime(key, iterations = 100) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    safeStorage.get(key, null)
  }
  return Math.round((performance.now() - start) / iterations * 100) / 100
}

export function measureStorageWriteTime(key, value, iterations = 50) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    safeStorage.set(key + '_perf_' + i, value)
  }
  for (let i = 0; i < iterations; i++) {
    safeStorage.remove(key + '_perf_' + i)
  }
  return Math.round((performance.now() - start) / iterations * 100) / 100
}

export function measureBackupDuration(fn) {
  const start = performance.now()
  const result = fn()
  return { duration: Math.round(performance.now() - start), result }
}

export async function measureAsyncBackupDuration(fn) {
  const start = performance.now()
  const result = await fn()
  return { duration: Math.round(performance.now() - start), result }
}

export function estimateMemoryUsage() {
  const metrics = {}
  if (performance.memory) {
    metrics.usedJSHeapSize = Math.round(performance.memory.usedJSHeapSize / 1024)
    metrics.totalJSHeapSize = Math.round(performance.memory.totalJSHeapSize / 1024)
    metrics.jsHeapSizeLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024)
  } else {
    metrics.usedJSHeapSize = 'N/A'
    metrics.totalJSHeapSize = 'N/A'
    metrics.jsHeapSizeLimit = 'N/A'
  }
  return metrics
}

export function calculatePerformanceGrade(metrics) {
  let score = 100

  if (metrics.startupTime?.loadComplete > 3000) score -= 20
  else if (metrics.startupTime?.loadComplete > 2000) score -= 10
  else if (metrics.startupTime?.loadComplete > 1000) score -= 5

  if (metrics.storageReadTime > 5) score -= 15
  else if (metrics.storageReadTime > 2) score -= 8
  else if (metrics.storageReadTime > 1) score -= 3

  if (metrics.storageWriteTime > 10) score -= 15
  else if (metrics.storageWriteTime > 5) score -= 8
  else if (metrics.storageWriteTime > 2) score -= 3

  if (metrics.backupDuration > 2000) score -= 15
  else if (metrics.backupDuration > 1000) score -= 8
  else if (metrics.backupDuration > 500) score -= 3

  if (metrics.searchTime !== undefined && metrics.searchTime > 500) score -= 10
  else if (metrics.searchTime !== undefined && metrics.searchTime > 200) score -= 5

  score = Math.max(0, Math.min(100, score))

  let grade
  if (score >= 90) grade = 'A'
  else if (score >= 80) grade = 'B'
  else if (score >= 65) grade = 'C'
  else if (score >= 45) grade = 'D'
  else grade = 'F'

  return { score, grade }
}

export function runPerformanceAudit({ backupFn } = {}) {
  const startupTime = measureStartupTime()
  const storageReadTime = measureStorageReadTime('test_key', 50)
  const storageWriteTime = measureStorageWriteTime('test_key', { data: 'perf_test' }, 30)
  const memoryEstimate = estimateMemoryUsage()

  let backupDuration = 0
  if (backupFn) {
    const bm = measureBackupDuration(backupFn)
    backupDuration = bm.duration
  }

  const performanceMetrics = {
    startupTime,
    storageReadTime,
    storageWriteTime,
    backupDuration,
    memoryEstimate,
    searchTime: 0,
  }

  const { score, grade } = calculatePerformanceGrade(performanceMetrics)

  return {
    metrics: performanceMetrics,
    score,
    grade,
    timestamp: Date.now(),
  }
}
