export type GitHubRepository = { full_name: string; default_branch: string; html_url: string }
export type GitHubCommit = { sha: string; message: string; author: string; timestamp: string; url: string }
export type GitHubWorkflowRun = { id: number; name: string; status: string; conclusion: string | null; branch: string; head_sha: string; event: string; created_at: string; updated_at: string; url: string }

class GitHubError extends Error { constructor(public status: number, message: string) { super(message) } }

export function getGitHubConfig() {
  const hasToken = Boolean(process.env.GITHUB_TOKEN)
  const hasOwner = Boolean(process.env.GITHUB_OWNER)
  const hasRepo = Boolean(process.env.GITHUB_REPO)
  return { configured: hasToken && hasOwner && hasRepo, hasToken, hasOwner, hasRepo, owner: process.env.GITHUB_OWNER || null, repo: process.env.GITHUB_REPO || null }
}

function configured() { return getGitHubConfig().configured }
function repoPath() { return `${encodeURIComponent(process.env.GITHUB_OWNER || '')}/${encodeURIComponent(process.env.GITHUB_REPO || '')}` }

async function github<T>(path: string): Promise<T> {
  const config = getGitHubConfig()
  if (!config.configured) {
    const missing = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].filter((key) => !config[{ GITHUB_TOKEN: 'hasToken', GITHUB_OWNER: 'hasOwner', GITHUB_REPO: 'hasRepo' }[key] as 'hasToken' | 'hasOwner' | 'hasRepo']).join(' / ')
    throw new GitHubError(503, `GitHub integration is not configured. Missing: ${missing}`)
  }
  const response = await fetch(`https://api.github.com/repos/${repoPath()}${path}`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'x-github-api-version': '2022-11-28' }, signal: AbortSignal.timeout(12000), cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) { const message = response.status === 401 ? 'GitHub authentication failed.' : response.status === 403 ? 'GitHub access denied or rate limit exceeded.' : response.status === 404 ? 'GitHub repository was not found.' : `GitHub returned ${response.status}.`; throw new GitHubError(response.status, message) }
  return body as T
}

export function isGitHubConfigured() { return configured() }
export async function getRepository() { return github<GitHubRepository>('') }
export async function getRecentCommits() { const data = await github<any[]>('/commits?per_page=8'); return data.map((commit) => ({ sha: commit.sha, message: commit.commit?.message?.split('\n')[0] || 'No commit message', author: commit.commit?.author?.name || commit.author?.login || 'Unknown', timestamp: commit.commit?.author?.date || '', url: commit.html_url })) }
export async function getCommit(sha: string) { return github<any>(`/commits/${encodeURIComponent(sha)}`) }
export async function getChangedFiles(sha: string) { const data = await github<{ files?: any[] }>(`/commits/${encodeURIComponent(sha)}`); return (data.files || []).map((file) => ({ filename: file.filename, status: file.status, additions: file.additions, deletions: file.deletions, changes: file.changes, patch: file.patch || null })) }
export async function getWorkflowRuns() { const data = await github<{ workflow_runs: any[] }>('/actions/runs?per_page=8'); return (data.workflow_runs || []).map(toRun) }
export async function getWorkflowRun(runId: number) { return toRun(await github<any>(`/actions/runs/${runId}`)) }
export async function getWorkflowJobs(runId: number) { const data = await github<{ jobs: any[] }>(`/actions/runs/${runId}/jobs`); return data.jobs || [] }
export async function getWorkflowLogs(runId: number, jobId?: number) { const path = jobId ? `/actions/jobs/${jobId}/logs` : `/actions/runs/${runId}/logs`; const response = await fetch(`https://api.github.com/repos/${repoPath()}${path}`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'x-github-api-version': '2022-11-28' }, signal: AbortSignal.timeout(12000), cache: 'no-store', redirect: 'follow' }); if (!response.ok || response.status >= 300) return null; const bytes = await response.arrayBuffer(); let text = ''; try { const archive = await (await import('jszip')).default.loadAsync(bytes); const entries = Object.entries(archive.files).filter(([, file]) => !file.dir); text = (await Promise.all(entries.map(async ([name, file]) => `${name}\n${await file.async('string')}`))).join('\n') } catch { text = new TextDecoder().decode(bytes) } const failureLines = text.split(/\r?\n/).filter((line) => /FAILED|FAILURE|AssertionError|Error:|Expected|Actual|Traceback|exception|error:/i.test(line) && !/deprecated|deprecation|node\.js 20/i.test(line)); return (failureLines.length ? failureLines.slice(-80).join('\n') : text.replace(/.*(?:deprecated|deprecation|node\.js 20).*\n?/gi, '').slice(-4000)).trim() || null }
function toRun(run: any): GitHubWorkflowRun { return { id: run.id, name: run.name || run.workflow_name || 'GitHub Actions', status: run.status, conclusion: run.conclusion, branch: run.head_branch, head_sha: run.head_sha, event: run.event, created_at: run.created_at, updated_at: run.updated_at, url: run.html_url } }
export { GitHubError }

export async function getGitHubContext() { const [repository, commits, runs] = await Promise.all([getRepository(), getRecentCommits(), getWorkflowRuns()]); return { repository: repository.full_name, branch: repository.default_branch, latestCommit: commits[0] ? { sha: commits[0].sha, message: commits[0].message } : null, recentCommits: commits.slice(0, 5), workflows: runs.slice(0, 5), workflow: runs[0] || null } }
