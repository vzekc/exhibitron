class Cached<K, V> {
  private cache = new Map<K, Promise<V>>()
  private fetchFunction: (key: K) => Promise<V>

  constructor(fetchFunction: (key: K) => Promise<V>) {
    this.fetchFunction = fetchFunction
  }

  get(key: K): Promise<V> {
    if (!this.cache.has(key)) {
      this.cache.set(key, this.fetchFunction(key))
    }
    return this.cache.get(key)!
  }
}

export default Cached
