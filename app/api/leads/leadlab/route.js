import { ingestLeadRequest } from '../_shared'

export async function POST(request) {
  return ingestLeadRequest(request, 'leadlab', { allowSourceOverride: false })
}
