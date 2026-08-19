import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EventEmitter } from 'events'
import { heartbeat, type Socket } from './relay.js'

/*
 * The beat itself, on a socket that is only what the beat touches.
 *
 * Half a minute is a long time to spend in a test suite, so the clock is the
 * test's rather than the wall's; what is being checked is the sequence, which
 * is the same at any speed.
 */

class StubSocket extends EventEmitter {
  pings = 0
  terminated = false
  ping() {
    this.pings += 1
  }
  terminate() {
    this.terminated = true
    this.emit('close')
  }
}

const beat = () => vi.advanceTimersByTime(30_000)

describe('the heartbeat', () => {
  let socket: StubSocket
  let silences: number

  beforeEach(() => {
    vi.useFakeTimers()
    socket = new StubSocket()
    silences = 0
    heartbeat(socket as unknown as Socket, () => {
      silences += 1
    })
  })

  afterEach(() => vi.useRealTimers())

  test('a socket that answers is pinged and left alone', () => {
    for (let i = 0; i < 5; i += 1) {
      beat()
      socket.emit('pong')
    }
    expect(socket.pings).toBe(5)
    expect(socket.terminated).toBe(false)
    expect(silences).toBe(0)
  })

  test('a socket that says nothing is dropped, and said to be gone', () => {
    beat()
    expect(socket.pings).toBe(1)
    expect(socket.terminated).toBe(false)

    beat()
    expect(socket.terminated).toBe(true)
    expect(silences).toBe(1)
  })

  test('a socket that has gone is not pinged afterwards', () => {
    socket.emit('close')
    beat()
    beat()
    expect(socket.pings).toBe(0)
  })
})
