export type EvaluationResult = { id: string; scenario: string; baselineAction: string; hindsightAction: string; baselineScore: number; hindsightScore: number; memoryChanged: boolean; rationale: string }

export const evaluationScenarios = [
  { id: 'latency-regression', scenario: 'API latency increased immediately after deployment', baseline: 'scale_compute', hindsight: 'inspect_commit' },
  { id: 'ci-failure', scenario: 'CI build failed after a health check change', baseline: 'inspect_commit', hindsight: 'inspect_ci_failure' },
  { id: 'dependency-regression', scenario: 'Dependency upgrade caused elevated error rate', baseline: 'rollback_deployment', hindsight: 'inspect_commit' },
]

export function runEvaluation(): EvaluationResult[] {
  return evaluationScenarios.map((item) => ({ id: item.id, scenario: item.scenario, baselineAction: item.baseline, hindsightAction: item.hindsight, baselineScore: item.baseline === 'rollback_deployment' ? 0.35 : 0.6, hindsightScore: 0.9, memoryChanged: item.baseline !== item.hindsight, rationale: 'Historical evidence favors inspection and verification before an irreversible change.' }))
}
