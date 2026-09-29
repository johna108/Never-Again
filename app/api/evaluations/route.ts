import { NextResponse } from 'next/server'
import { runEvaluation } from '@/lib/evaluation'

export async function GET() {
  const results = runEvaluation()
  const averageBaseline = results.reduce((sum, item) => sum + item.baselineScore, 0) / results.length
  const averageHindsight = results.reduce((sum, item) => sum + item.hindsightScore, 0) / results.length
  return NextResponse.json({ results, summary: { scenarios: results.length, averageBaseline, averageHindsight, improvement: averageHindsight - averageBaseline, changedDecisions: results.filter((item) => item.memoryChanged).length } })
}
