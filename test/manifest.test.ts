import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { VERSION } from '../src/client.js'

describe('package manifest', () => {
  it('keeps the npm client version separate from the MCP Registry version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      name: string
      version: string
      license: string
      bin: Record<string, string>
      engines: { node: string }
      scripts: Record<string, string>
      dependencies?: Record<string, string>
      publishConfig: { access: string }
    }
    const registry = JSON.parse(readFileSync(new URL('../server.json', import.meta.url), 'utf8')) as { version: string }
    expect(pkg.name).toBe('vaneform-mcp')
    expect(pkg.version).toBe('0.1.3')
    expect(VERSION).toBe(pkg.version)
    expect(registry.version).toBe('1.4.3')
    expect(pkg.version).not.toBe(registry.version)
    expect(pkg.license).toBe('MIT')
    expect(pkg.engines.node).toBe('>=18')
    expect(pkg.publishConfig.access).toBe('public')
    expect(pkg.bin.vaneform).toBe('dist/bin/vaneform.js')
    expect(pkg.bin['vaneform-mcp']).toBe('dist/bin/vaneform-mcp.js')
    expect(pkg.dependencies).toBeUndefined()
    expect(pkg.scripts.prepare).toBe('npm run build')
    expect(pkg.scripts.preinstall).toBeUndefined()
    expect(pkg.scripts.install).toBeUndefined()
    expect(pkg.scripts.postinstall).toBeUndefined()
  })
})
