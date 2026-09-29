import { getGitHubConfig } from '@/lib/github'

const REPOSITORY = 'johna108/Great-Tests'
const WORKFLOW = '.github/workflows/staging-rollback.yml'
const REF = 'main'

export type RollbackExecution = { action: 'rollback_staging'; targetSha: string; runId: number; status: string; conclusion: string | null; targetShaVerified: boolean; workflow: string; repository: string }

function assertSha(value: unknown): asserts value is string { if (typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value)) throw new Error('target_sha must be a 40-character Git SHA.') }
function assertConfigured() { const config = getGitHubConfig(); if (!config.hasToken) throw new Error('GitHub token is not configured.') }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> { assertConfigured(); const response = await fetch(`https://api.github.com/repos/${REPOSITORY}${path}`, { ...init, headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'x-github-api-version': '2022-11-28', ...(init.headers || {}) }, signal: AbortSignal.timeout(12000), cache: 'no-store' }); if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body?.message === 'string' ? body.message : `GitHub returned ${response.status}.`) } return response.status === 204 ? (undefined as T) : await response.json() as T }

export async function dispatchStagingRollback(targetSha: string) { assertSha(targetSha); const before = Date.now(); await request(`/actions/workflows/${encodeURIComponent(WORKFLOW)}/dispatches`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref: REF, inputs: { target_sha: targetSha } }) }); for (let attempt = 0; attempt < 5; attempt += 1) { const data = await request<{ workflow_runs?: any[] }>(`/actions/workflows/${encodeURIComponent(WORKFLOW)}/runs?per_page=10`); const run = (data.workflow_runs || []).find((item) => item.event === 'workflow_dispatch' && new Date(item.created_at).getTime() >= before - 5000 && item.head_sha === targetSha) || (data.workflow_runs || []).find((item) => item.event === 'workflow_dispatch' && new Date(item.created_at).getTime() >= before - 5000); if (run) return { runId: run.id, targetSha, workflow: WORKFLOW, repository: REPOSITORY } ; await new Promise((resolve) => setTimeout(resolve, 1000)) } throw new Error('GitHub accepted the dispatch but no workflow run ID became available before timeout.') }
export async function getStagingRollbackRun(runId: number): Promise<RollbackExecution> { const run = await request<any>(`/actions/runs/${runId}`); return { action: 'rollback_staging', targetSha: run.head_sha, runId: run.id, status: run.status, conclusion: run.conclusion, targetShaVerified: typeof run.head_sha === 'string' && /^[a-f0-9]{40}$/i.test(run.head_sha), workflow: WORKFLOW, repository: REPOSITORY } }
export const stagingRollbackConfig = { repository: REPOSITORY, workflow: WORKFLOW, ref: REF }
