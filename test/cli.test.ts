import { afterEach, describe, expect, it } from 'vitest'

import { runCli } from '../src/cli.js'
import { VaneformClient, VERSION } from '../src/client.js'
import { type FakeRemote, startFakeRemote } from './fake-remote.js'

let remote: FakeRemote | undefined

afterEach(async () => {
  await remote?.close()
  remote = undefined
})

function capture() {
  const out = { stdout: [] as string[], stderr: [] as string[] }
  return {
    out,
    io: { stdout: (text: string) => out.stdout.push(text), stderr: (text: string) => out.stderr.push(text) },
  }
}

describe('cli', () => {
  it('prints a browser link and exits 2 without a key', async () => {
    const { out, io } = capture()
    const code = await runCli(['github.com'], new VaneformClient({ endpoint: 'http://127.0.0.1:9/mcp' }), io)
    expect(code).toBe(2)
    expect(out.stderr.join('\n')).toContain('https://vaneform.com/?q=github.com')
  })

  it('shows help, including expensive-call costs', async () => {
    const { out, io } = capture()
    expect(await runCli(['--help'], new VaneformClient(), io)).toBe(0)
    expect(out.stdout[0]).toContain('vaneform compare')
    expect(out.stdout[0]).toContain('60 credits')
    expect(out.stdout[0]).toContain('200 Pro credits')
  })

  it('prints the npm package version', async () => {
    const { out, io } = capture()
    expect(await runCli(['--version'], new VaneformClient(), io)).toBe(0)
    expect(out.stdout[0]).toBe(VERSION)
  })

  it('passes include only when asked, and forwards keyword and tld arguments', async () => {
    remote = await startFakeRemote()
    const client = new VaneformClient({ endpoint: remote.url, apiKey: 'vf_live_test' })
    const { io } = capture()
    expect(await runCli(['example.com'], client, io)).toBe(0)
    expect(await runCli(['example.com', '--include', 'scale,baidu'], client, io)).toBe(0)
    expect(await runCli(['keyword', 'website traffic'], client, io)).toBe(0)
    expect(await runCli(['tld', 'vaneform', '--suffixes=com,ai'], client, io)).toBe(0)
    const calls = remote.requests.map((request) => request.body.params)
    expect(calls).toEqual([
      { name: 'lookup_domain', arguments: { domain: 'example.com' } },
      { name: 'lookup_domain', arguments: { domain: 'example.com', include: 'scale,baidu' } },
      { name: 'lookup_keyword', arguments: { q: 'website traffic' } },
      { name: 'compare_tld', arguments: { q: 'vaneform', s: 'com,ai' } },
    ])
  })

  it('refuses a keyword lookup with no query before any network call', async () => {
    remote = await startFakeRemote()
    const client = new VaneformClient({ endpoint: remote.url, apiKey: 'vf_live_test' })
    const { out, io } = capture()
    expect(await runCli(['keyword'], client, io)).toBe(1)
    expect(out.stderr[0]).toContain('60 credits')
    expect(remote.requests).toHaveLength(0)
  })
})
