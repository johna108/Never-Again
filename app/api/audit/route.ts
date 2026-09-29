import { NextResponse } from 'next/server'

type AuditEvent = { id: string; timestamp: string; action: string; decision: string; environment: string; evidence: string }
const events: AuditEvent[] = []
export async function GET() { return NextResponse.json({ events }) }
export async function POST(request: Request) { const event = await request.json().catch(() => null); if (!event?.action || !event?.decision || !event?.environment) return NextResponse.json({ error: 'Audit event requires action, decision, and environment.' }, { status: 400 }); const saved = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action: String(event.action), decision: String(event.decision), environment: String(event.environment), evidence: String(event.evidence || '') }; events.unshift(saved); return NextResponse.json({ event: saved }, { status: 201 }) }
