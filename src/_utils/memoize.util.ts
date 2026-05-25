const defaultKey = 'default'

export function memoize<T>(fn: (type?: string | string[]) => T): (type?: string | string[]) => T {
  const cache: Record<string, T> = {}

  return (type?: string | string[]) => {
    const cacheKey = type === undefined ? defaultKey : (Array.isArray(type) ? type.join('\0') : type)

    if (cacheKey in cache) {
      return cache[cacheKey]
    }

    const result = fn(type)
    cache[cacheKey] = result
    return result
  }
}
