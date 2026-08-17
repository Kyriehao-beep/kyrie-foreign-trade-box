import { getStore } from '@edgeone/pages-blob'
import { createApi } from '../_lib/api.js'
import { createBlobRepository } from '../_lib/blobRepository.js'

export default async function onRequest(context) {
  const store = getStore({ name: 'kyrie-membership-v1', consistency: 'strong' })
  const repository = createBlobRepository(store)
  const api = createApi({ repository, env: context.env })
  return api(context.request, { clientIp: context.clientIp })
}
