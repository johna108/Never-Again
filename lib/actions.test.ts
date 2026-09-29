import { evaluatePolicy, validateAction } from './actions'

const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message) }
const inspection = validateAction({ type: 'inspect_commit', sha: '27ac9b8' })
if (!inspection.ok) throw new Error(inspection.error)
assert(evaluatePolicy(inspection.action, false).decision === 'ALLOWED', 'read-only inspection should be allowed')
const rollback = validateAction({ type: 'rollback_staging', targetSha: '27ac9b8' })
if (!rollback.ok) throw new Error(rollback.error)
assert(evaluatePolicy(rollback.action, false).decision === 'REQUIRES APPROVAL', 'rollback should require approval')
console.log('actions policy tests passed')
