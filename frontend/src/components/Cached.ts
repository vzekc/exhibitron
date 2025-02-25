class Cached<K, V> {
  private cache = new Map<K, { value: Promise<V>; timestamp: number }>()
  private fetchFunction: (key: K) => Promise<V>
  private cacheDuration = 1000 // cache duration in milliseconds

  constructor(fetchFunction: (key: K) => Promise<V>) {
    this.fetchFunction = fetchFunction
  }

  get(key: K): Promise<V> {
    const now = Date.now()
    const cachedEntry = this.cache.get(key)

    if (cachedEntry && now - cachedEntry.timestamp < this.cacheDuration) {
      return cachedEntry.value
    }

    const newValue = this.fetchFunction(key)
    this.cache.set(key, { value: newValue, timestamp: now })
    return newValue
  }
}

export default Cached
