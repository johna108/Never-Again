import { NextResponse } from 'next/server'
import { getGitHubConfig, getGitHubContext, GitHubError } from '@/lib/github'

export async function GET() {
  const config = getGitHubConfig()
  if (!config.configured) {
    const missing = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'].filter((key) => !config[{ GITHUB_TOKEN: 'hasToken', GITHUB_OWNER: 'hasOwner', GITHUB_REPO: 'hasRepo' }[key] as 'hasToken' | 'hasOwner' | 'hasRepo']).join(' / ')
    return NextResponse.json({ connected: false, errorType: 'configuration', message: `GitHub integration is not configured. Missing: ${missing}`, diagnostics: config }, { status: 503 })
  }

  try {
    const context = await getGitHubContext()
    return NextResponse.json({ connected: true, repository: { owner: config.owner, name: config.repo, fullName: context.repository }, branch: context.branch, latestCommit: context.latestCommit, recentCommits: context.recentCommits, workflows: context.workflows, workflow: context.workflow, diagnostics: { ...config, apiReachable: true, repositoryAccessible: true } })
  } catch (error) {
    const status = error instanceof GitHubError ? error.status : 503
    const errorType = status === 401 ? 'authentication' : status === 403 ? 'permission' : status === 404 ? 'repository' : 'unavailable'
    const message = error instanceof Error ? error.message : 'GitHub unavailable.'
    console.error('[github] connection test failed', { status, errorType, message })
    return NextResponse.json({ connected: false, errorType, message, diagnostics: { ...config, apiReachable: false } }, { status: status >= 400 && status < 600 ? status : 503 })
  }
}
