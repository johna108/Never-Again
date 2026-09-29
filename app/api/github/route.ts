import { NextResponse } from 'next/server'
import { getGitHubContext, getRecentCommits, getRepository, getWorkflowRuns, GitHubError, isGitHubConfigured } from '@/lib/github'

export async function GET() {
  if (!isGitHubConfigured()) return NextResponse.json({ connected: false, message: 'GitHub is not configured.' })
  try { const context = await getGitHubContext(); return NextResponse.json({ connected: true, ...context }) }
  catch (error) { const status = error instanceof GitHubError ? error.status : 503; return NextResponse.json({ connected: false, message: error instanceof Error ? error.message : 'GitHub unavailable.' }, { status: status >= 400 && status < 600 ? status : 503 }) }
}

export async function POST() {
  try { const [repository, commits, runs] = await Promise.all([getRepository(), getRecentCommits(), getWorkflowRuns()]); return NextResponse.json({ connected: true, repository, commits, runs }) }
  catch (error) { const status = error instanceof GitHubError ? error.status : 503; return NextResponse.json({ connected: false, message: error instanceof Error ? error.message : 'GitHub unavailable.' }, { status: status >= 400 && status < 600 ? status : 503 }) }
}
