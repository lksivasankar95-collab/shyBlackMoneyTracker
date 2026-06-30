export function measureRenderTime(componentName) {
  let startTime = 0
  return {
    start() {
      startTime = performance.now()
    },
    end() {
      const duration = performance.now() - startTime
      if (duration > 16) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Perf] ${componentName} took ${duration.toFixed(2)}ms (exceeds 16ms frame budget)`)
        }
      }
      return duration
    },
  }
}

export function debounce(fn, ms = 300) {
  let timer = null
  const debounced = function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, ms)
  }
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  debounced.flush = function (...args) {
    if (timer) {
      clearTimeout(timer)
      timer = null
      fn.apply(this, args)
    }
  }
  return debounced
}

export function throttle(fn, ms = 300) {
  let lastTime = 0
  let timer = null
  const throttled = function (...args) {
    const now = Date.now()
    const remaining = ms - (now - lastTime)
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      lastTime = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return throttled
}

export function memoCompare(prev, next) {
  if (prev === next) return true
  if (typeof prev !== typeof next) return false
  if (prev && next && typeof prev === 'object' && typeof next === 'object') {
    const pKeys = Object.keys(prev)
    const nKeys = Object.keys(next)
    if (pKeys.length !== nKeys.length) return false
    for (const key of pKeys) {
      if (prev[key] !== next[key]) return false
    }
    return true
  }
  return false
}

export function lazyLoad(importFn, fallback = null, timeout = 10000) {
  let resolved = false
  let result = null
  const timer = setTimeout(() => {
    if (!resolved) {
      console.warn(`[lazyLoad] Import timed out after ${timeout}ms`)
    }
  }, timeout)

  return new Promise((resolve) => {
    importFn()
      .then((mod) => {
        resolved = true
        clearTimeout(timer)
        result = mod.default || mod
        resolve(result)
      })
      .catch(() => {
        resolved = true
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}
