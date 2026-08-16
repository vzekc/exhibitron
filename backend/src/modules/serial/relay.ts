import type { SocketStream } from '@fastify/websocket'

/*
 * The socket as the plugin hands it over. Taking the type from there rather
 * than from `ws` keeps this on the one copy of those typings that is actually
 * in the request path.
 */
export type Socket = SocketStream['socket']

/*
 * The relay: what joins an exhibitor to a login on a machine it cannot reach.
 *
 * fotofix sits on a hall's network with no inbound route, so it dials here
 * and holds one socket open. When somebody connects, that socket is asked for
 * a session, and the agent dials back a second time carrying the id it was
 * given. This end never opens a connection to anything.
 *
 * Frames are copied and not read: binary is the serial stream, text is what
 * the client says about the wire it owns, and both belong to the two ends.
 * Anything this code did to a frame would be damage.
 */

export type Agent = {
  name: string
  socket: Socket
  protocol: number
  maxSessions: number
  sessions: number
}

type Frame = { data: Buffer; isBinary: boolean }

/* An exhibitor who has arrived, waiting for the agent to dial their session. */
type Waiting = {
  sid: string
  agent: Agent
  client: Socket
  exhibitorId: number
  timer: NodeJS.Timeout
  /*
   * A client says how fast its wire runs the moment it connects, which is a
   * second or so before the agent has dialled back and there is anywhere to
   * put it. Those frames are held here and delivered when the two are joined;
   * losing them would leave the agent pacing at its default for the whole
   * session.
   */
  queued: Frame[]
  collect: (data: Buffer, isBinary: boolean) => void
}

/* Enough for the opening words of any client, and a bound on a stalled one. */
const MAX_QUEUED_FRAMES = 64

/* How long the agent has to dial back before the exhibitor is told it did not. */
const DIAL_TIMEOUT_MS = 15_000

/* One person, one machine, and a spare — not the whole agent to themselves. */
export const SESSIONS_PER_EXHIBITOR = 2

const agents = new Map<string, Agent>()
const waiting = new Map<string, Waiting>()
const sessionsByExhibitor = new Map<number, number>()

export function registerAgent(agent: Agent) {
  agents.get(agent.name)?.socket.close(1000, 'replaced by a newer registration')
  agents.set(agent.name, agent)
}

/*
 * A registration that has already been replaced takes nothing with it: the
 * socket that dialled again belongs to the same agent, and the session it was
 * asked for is dialled back by that same process. Where the agent really has
 * gone, the dial timeout says so a few seconds later.
 */
export function unregisterAgent(agent: Agent) {
  if (agents.get(agent.name) !== agent) return
  agents.delete(agent.name)

  /* Anybody still waiting on it will never be dialled. */
  for (const entry of [...waiting.values()]) {
    if (entry.agent === agent) failWaiting(entry.sid, 'the agent went away')
  }
}

export function listAgents() {
  return [...agents.values()].map((agent) => ({
    name: agent.name,
    sessions: agent.sessions,
    maxSessions: agent.maxSessions,
  }))
}

export function findAgent(name?: string): Agent | null {
  if (name) return agents.get(name) ?? null
  /* One registered agent is the answer to the question nobody asked. */
  return agents.size === 1 ? [...agents.values()][0] : null
}

export function sessionsFor(exhibitorId: number) {
  return sessionsByExhibitor.get(exhibitorId) ?? 0
}

function countSession(exhibitorId: number, delta: number) {
  const now = sessionsFor(exhibitorId) + delta
  if (now > 0) sessionsByExhibitor.set(exhibitorId, now)
  else sessionsByExhibitor.delete(exhibitorId)
}

function failWaiting(sid: string, reason: string) {
  const entry = waiting.get(sid)
  if (!entry) return
  waiting.delete(sid)
  clearTimeout(entry.timer)
  say(entry.client, { t: 'exit', reason })
  entry.client.close(1011, reason)
}

/*
 * Ask an agent for a session and park the exhibitor until it dials back. The
 * pty is allocated over there and not here, so the login prompt is written for
 * somebody who is already attached to read it.
 */
export function requestSession(options: {
  sid: string
  agent: Agent
  client: Socket
  exhibitorId: number
  mode: string
  term: string
  cols: number
  rows: number
}) {
  const { sid, agent, client, exhibitorId, mode, term, cols, rows } = options

  const timer = setTimeout(() => failWaiting(sid, 'the agent did not answer'), DIAL_TIMEOUT_MS)

  const queued: Frame[] = []
  const collect = (data: Buffer, isBinary: boolean) => {
    if (queued.length < MAX_QUEUED_FRAMES) queued.push({ data, isBinary })
  }
  client.on('message', collect)

  waiting.set(sid, { sid, agent, client, exhibitorId, timer, queued, collect })

  client.on('close', () => {
    /* Gone before the agent arrived; nothing should be dialled for them. */
    if (waiting.delete(sid)) clearTimeout(timer)
  })

  say(agent.socket, { t: 'open', sid, mode, term, cols, rows })
}

/* The agent has dialled back for a session somebody is waiting on. */
export function joinSession(sid: string, agentSide: Socket): boolean {
  const entry = waiting.get(sid)
  if (!entry) return false

  waiting.delete(sid)
  clearTimeout(entry.timer)

  entry.agent.sessions += 1
  countSession(entry.exhibitorId, 1)

  entry.client.off('message', entry.collect)
  pipe(entry.client, agentSide)
  pipe(agentSide, entry.client)

  /* What the client said while there was nobody to hear it, in order. */
  for (const frame of entry.queued) {
    agentSide.send(frame.data, { binary: frame.isBinary })
  }

  const finish = () => {
    entry.agent.sessions = Math.max(0, entry.agent.sessions - 1)
    countSession(entry.exhibitorId, -1)
    close(entry.client)
    close(agentSide)
  }
  entry.client.once('close', finish)
  agentSide.once('close', finish)

  return true
}

/*
 * A frame at a time, with its type intact. A binary frame that arrived as text
 * would reach the far end as replacement characters, in the middle of whatever
 * the machine was being sent.
 */
function pipe(from: Socket, to: Socket) {
  from.on('message', (data: Buffer, isBinary: boolean) => {
    if (to.readyState !== to.OPEN) return
    to.send(data, { binary: isBinary })
  })
  from.on('error', () => close(to))
}

function close(socket: Socket) {
  if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
    socket.close(1000, 'the other end went away')
  }
}

export function say(socket: Socket, message: Record<string, unknown>) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
}

/* For tests, which need to start from nothing. */
export function forgetEverything() {
  for (const agent of agents.values()) agent.socket.close()
  agents.clear()
  for (const entry of waiting.values()) clearTimeout(entry.timer)
  waiting.clear()
  sessionsByExhibitor.clear()
}
