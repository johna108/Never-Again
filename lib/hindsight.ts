const baseUrl = (process.env.HINDSIGHT_API_URL || 'http://localhost:8888').replace(/\/$/, '')
const bankId = process.env.HINDSIGHT_BANK_ID || 'never-again-engineering'

export type HindsightMemory = {
  id?: string
  content?: string
  text?: string
  type?: string
  score?: number
  metadata?: Record<string, unknown>
  timestamp?: string
}

async function hindsightRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('content-type', 'application/json')
  if (process.env.HINDSIGHT_API_KEY) headers.set('authorization', `Bearer ${process.env.HINDSIGHT_API_KEY}`)
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, cache: 'no-store' })
  if (!response.ok) throw new Error(`Hindsight returned ${response.status}`)
  return response.json()
}

export async function retainExperience(content: string, context = 'engineering incident outcome') {
  return hindsightRequest(`/v1/default/banks/${encodeURIComponent(bankId)}/memories`, {
    method: 'POST',
    body: JSON.stringify({ content, context, async: true }),
  })
}

export async function recallExperiences(query: string) {
  return hindsightRequest(`/v1/default/banks/${encodeURIComponent(bankId)}/recall`, {
    method: 'POST',
    body: JSON.stringify({ query, max_tokens: 2600 }),
  })
}

export async function reflectOnExperiences(query: string) {
  return hindsightRequest(`/v1/default/banks/${encodeURIComponent(bankId)}/reflect`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

export async function getHindsightStatus() {
  const result = await recallExperiences('organizational engineering incident experience')
  return { connected: true, bankId, memories: Array.isArray(result) ? result.length : (result?.results?.length ?? 0) }
}

export function normalizeMemories(payload: any): HindsightMemory[] {
  const items = Array.isArray(payload) ? payload : payload?.results || payload?.memories || payload?.items || []
  return items.map((item: any) => ({
    id: item.id || item.memory_id,
    content: item.content || item.text || item.fact,
    text: item.text || item.content || item.fact,
    type: item.type || item.memory_type,
    score: item.score || item.relevance,
    metadata: item.metadata,
    timestamp: item.timestamp || item.created_at,
  }))
}

export { bankId }

export function buildExperience(incident: any, outcome: any) {
  return [
    `Engineering incident ${incident.id || 'new incident'} on ${incident.service || 'unknown service'}.`,
    `Context: ${incident.description}. Environment: ${incident.environment || 'production'}. Severity: ${incident.severity || 'SEV-2'}.`,
    `Attempted action: ${outcome.action}. Outcome: ${outcome.status}.`,
    `Root cause: ${outcome.rootCause}. Resolution: ${outcome.resolution}.`,
    `Lesson: ${outcome.lesson}. Time to resolution: ${outcome.timeToResolution} minutes.`,
  ].join(' ')
}

export const hindsightConfig = { baseUrl, bankId }
