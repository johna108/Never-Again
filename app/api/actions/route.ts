import { NextResponse } from 'next/server'
import { evaluatePolicy, validateAction } from '@/lib/actions'
import { dispatchStagingRollback, getStagingRollbackRun } from '@/lib/github-actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = validateAction(body.action)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    const policy = evaluatePolicy(validation.action, body.approved === true)
    if (policy.decision !== 'ALLOWED') return NextResponse.json({ policy, action: validation.action }, { status: policy.decision === 'REQUIRES APPROVAL' ? 428 : 403 })
    if (validation.action.type !== 'rollback_staging') return NextResponse.json({ error: 'Only rollback_staging has a real executor.' }, { status: 403 })
    const dispatched = await dispatchStagingRollback(validation.action.targetSha)
    return NextResponse.json({ policy, state: 'WORKFLOW DISPATCHED', execution: { ...dispatched, targetSha: validation.action.targetSha } })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Action execution failed.' }, { status: 502 }) }
}

export async function GET(request: Request) {
  const runId = Number(new URL(request.url).searchParams.get('runId'))
  if (!Number.isInteger(runId) || runId <= 0) return NextResponse.json({ error: 'A valid workflow run ID is required.' }, { status: 400 })
  try { const execution = await getStagingRollbackRun(runId); const targetSha = new URL(request.url).searchParams.get('targetSha'); const terminal = execution.status === 'completed'; const logs = terminal ? await (await import('@/lib/github')).getWorkflowLogs(runId) : null; const targetVerified = Boolean(targetSha && logs && logs.includes(targetSha)); const state = terminal ? execution.conclusion === 'success' && targetVerified ? 'SUCCESS' : 'FAILED' : execution.status === 'queued' ? 'WAITING FOR GITHUB' : 'RUNNING'; return NextResponse.json({ state, execution: { ...execution, targetSha: targetSha || execution.targetSha, targetShaVerified: targetVerified, verification: terminal ? { workflowCompleted: true, requestedTargetShaObserved: targetVerified, workflowVerification: execution.conclusion === 'success' } : null }, failure: terminal && state === 'FAILED' ? targetVerified ? 'GitHub workflow did not complete successfully or its verification failed.' : 'Requested target SHA was not observed in GitHub workflow evidence.' : null }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to poll workflow.' }, { status: 502 }) }
}
