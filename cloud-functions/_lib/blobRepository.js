export function createBlobRepository(store) {
  async function normalizeConditionalWrite(work) {
    try {
      await work()
    } catch (error) {
      if (error?.code === 'PRECONDITION_FAILED') {
        const conflict = new Error('Object already exists')
        conflict.code = 'ALREADY_EXISTS'
        throw conflict
      }
      throw error
    }
  }

  return {
    async getJson(key) {
      return store.get(key, { type: 'json', consistency: 'strong' })
    },
    async setJson(key, value, options = {}) {
      await normalizeConditionalWrite(() => store.setJSON(key, value, options.onlyIfNew ? { onlyIfNew: true } : undefined))
    },
    async setBinary(key, value, options = {}) {
      await normalizeConditionalWrite(() => store.set(key, value, options.onlyIfNew ? { onlyIfNew: true } : undefined))
    },
    async getBinary(key) {
      const value = await store.get(key, { type: 'arrayBuffer', consistency: 'strong' })
      return value == null ? null : new Uint8Array(value)
    },
    async delete(key) {
      await store.delete(key)
    },
    async list(prefix) {
      const result = await store.list({ prefix, consistency: 'strong' })
      return result.blobs.map((item) => item.key)
    },
  }
}
