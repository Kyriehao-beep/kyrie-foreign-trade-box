function copy(value) {
  return value == null ? value : structuredClone(value)
}

export function createMemoryRepository() {
  const values = new Map()

  return {
    async getJson(key) {
      return copy(values.get(key) ?? null)
    },
    async setJson(key, value, options = {}) {
      if (options.onlyIfNew && values.has(key)) {
        const error = new Error('Object already exists')
        error.code = 'ALREADY_EXISTS'
        throw error
      }
      values.set(key, copy(value))
    },
    async setBinary(key, value, options = {}) {
      if (options.onlyIfNew && values.has(key)) {
        const error = new Error('Object already exists')
        error.code = 'ALREADY_EXISTS'
        throw error
      }
      values.set(key, new Uint8Array(value))
    },
    async getBinary(key) {
      const value = values.get(key)
      return value instanceof Uint8Array ? new Uint8Array(value) : null
    },
    async delete(key) {
      values.delete(key)
    },
    async list(prefix) {
      return [...values.keys()].filter((key) => key.startsWith(prefix)).sort()
    },
  }
}
