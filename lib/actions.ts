export type AgentAction =
  | { type: 'inspect_ci_failure'; runId: number }
  | { type: 'inspect_commit'; sha: string }
  | { type: 'rollback_staging'; targetSha: string }
  | { type: 'redeploy_staging'; sha: string }
  | { type: 'restart_staging_service'; service: string }
  | { type: 'verify_staging_health' }

export type PolicyDecision = 'ALLOWED' | 'REQUIRES APPROVAL' | 'BLOCKED'
export type ActionPolicy = { risk: 'LOW' | 'MEDIUM' | 'HIGH'; environment: 'STAGING'; approval: boolean; verification: string }

const policies: Record<AgentAction['type'], ActionPolicy> = {
  inspect_ci_failure: { risk: 'LOW', environment: 'STAGING', approval: false, verification: 'Workflow and failed-job evidence retrieved' },
  inspect_commit: { risk: 'LOW', environment: 'STAGING', approval: false, verification: 'Commit and changed files retrieved' },
  rollback_staging: { risk: 'HIGH', environment: 'STAGING', approval: true, verification: 'Deployment SHA, health, latency, and error rate' },
  redeploy_staging: { risk: 'HIGH', environment: 'STAGING', approval: true, verification: 'Deployment SHA and health' },
  restart_staging_service: { risk: 'MEDIUM', environment: 'STAGING', approval: true, verification: 'Service health and error rate' },
  verify_staging_health: { risk: 'LOW', environment: 'STAGING', approval: false, verification: 'Health, latency, and error rate' },
}

export function getActionPolicy(action: AgentAction) { return policies[action.type] }
export function validateAction(input: unknown): { ok: true; action: AgentAction } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || !('type' in input)) return { ok: false, error: 'Unknown action type.' }
  const value = input as Record<string, unknown>
  switch (value.type) {
    case 'inspect_ci_failure': return Number.isInteger(value.runId) && Number(value.runId) > 0 ? { ok: true, action: { type: 'inspect_ci_failure', runId: Number(value.runId) } } : { ok: false, error: 'runId must be a positive integer.' }
    case 'inspect_commit': return typeof value.sha === 'string' && /^[a-f0-9]{7,64}$/i.test(value.sha) ? { ok: true, action: { type: 'inspect_commit', sha: value.sha } } : { ok: false, error: 'sha must be a valid commit identifier.' }
    case 'rollback_staging': return typeof value.targetSha === 'string' && /^[a-f0-9]{40}$/i.test(value.targetSha) ? { ok: true, action: { type: 'rollback_staging', targetSha: value.targetSha } } : { ok: false, error: 'targetSha must be a 40-character Git SHA.' }
    case 'redeploy_staging': return typeof value.sha === 'string' && /^[a-f0-9]{7,64}$/i.test(value.sha) ? { ok: true, action: { type: 'redeploy_staging', sha: value.sha } } : { ok: false, error: 'sha must be a valid staging commit identifier.' }
    case 'restart_staging_service': return typeof value.service === 'string' && /^[a-z0-9-]{1,48}$/i.test(value.service) ? { ok: true, action: { type: 'restart_staging_service', service: value.service } } : { ok: false, error: 'service must be a safe service identifier.' }
    case 'verify_staging_health': return { ok: true, action: { type: 'verify_staging_health' } }
    default: return { ok: false, error: 'Unknown action type.' }
  }
}

export function evaluatePolicy(action: AgentAction, approved = false) { const policy = getActionPolicy(action); if (!policy) return { decision: 'BLOCKED' as const, explanation: 'Unknown actions are blocked.' }; if (policy.environment !== 'STAGING') return { decision: 'BLOCKED' as const, explanation: 'Production actions are never allowed.' }; if (policy.approval && !approved) return { decision: 'REQUIRES APPROVAL' as const, explanation: `${action.type} is ${policy.risk}-risk and requires explicit human approval.` }; return { decision: 'ALLOWED' as const, explanation: 'Typed staging action passed the safety gate.' } }
