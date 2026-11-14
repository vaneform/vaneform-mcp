import { describe, expect, it } from 'vitest'

import { VaneformClient } from '../src/client.js'
import { createHandler } from '../src/server.js'

describe('stdio handler', () => {
  const client = new VaneformClient({ endpoint: 'http://127.0.0.1:9/mcp' })
  const handle = createHandler(client)

  it('answers initialize offline with estimate, consent, and untrusted-data rules', async () => {
    const response = await handle({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    })
    expect(response?.result).toMatchObject({ protocolVersion: '2025-03-26', serverInfo: { name: 'vaneform' } })
    const result = response?.result as { instructions?: string } | undefined
    const instructions = result?.instructions ?? ''
    expect(instructions).toContain('third-party estimates')
    expect(instructions).toContain('explicitly agreed')
    expect(instructions).toContain('untrusted')
    expect(instructions).not.toMatch(/vf_live_[A-Za-z0-9]{8,}/u)
  })

  it('rejects unknown methods and ignores notifications without a network call', async () => {
    const rejected = await handle({ jsonrpc: '2.0', id: 2, method: 'sampling/createMessage', params: {} })
    expect(rejected?.error?.code).toBe(-32601)
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull()
  })
})
