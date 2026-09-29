# Never Again

Never Again is an experience-intelligence prototype for safer engineering decisions. It combines current GitHub evidence, historical Hindsight memory, Groq reasoning, typed actions, explicit policy gates, deterministic staging verification, and auditable outcomes.

## Product surfaces

- **Ask before you act**: compare memory-on and baseline decisions.
- **DevOps**: read-only repository, commit, workflow, job, and log evidence.
- **Staging**: deterministic incident scenarios with approval and verification gates.
- **Learned playbook**: retained incident experiences and lessons.
- **Evaluations**: repeatable baseline-vs-Hindsight scenario comparison.
- **Audit log**: policy, approval, execution, and verification evidence.
- **Demo mode**: the same staging simulator presented as a repeatable walkthrough.

## Runtime configuration

Set these server-side environment variables in the Vercel project:

- `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`
- `GROQ_API_KEY`, `GROQ_MODEL`
- `HINDSIGHT_API_KEY`, `HINDSIGHT_API_URL`, `HINDSIGHT_BANK_ID`

The GitHub integration is read-only. The staging simulator is deterministic and does not touch production systems or execute arbitrary commands.

## Local verification

```bash
npm run build
node -e "require('./lib/actions.test.ts')"
```

The UI is available at `/ask`, `/staging`, `/demo`, `/evaluations`, `/learned-playbook`, `/devops`, and `/audit`.
