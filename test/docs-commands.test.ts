import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const docs = ['README.md', 'README.zh-CN.md', 'RELEASING.md', 'skills/website-traffic-lookup/SKILL.md']

function text(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

const badPackageNpx = /npx\s+(?:-[^\s]+\s+)*vaneform-mcp(?:@\S+)?\s+vaneform\b/u

describe('documented commands', () => {
  it('does not tell npx to pass the CLI name to the stdio bin, and does not invent a skills rename flag', () => {
    for (const path of docs) {
      const body = text(path)
      expect(body, path).not.toMatch(badPackageNpx)
      expect(body, path).not.toContain('--rename')
    }
  })

  it('gives the package-scoped CLI, the npm exec form, and the GitHub -p form', () => {
    for (const path of ['README.md', 'README.zh-CN.md', 'RELEASING.md']) {
      const body = text(path)
      expect(body, path).toContain('npx -y --package=vaneform-mcp@0.1.3 vaneform --version')
      expect(body, path).toContain('npm exec -y --package=vaneform-mcp@0.1.3 -- vaneform --version')
      expect(body, path).toContain('npx -p github:vaneform/vaneform-mcp vaneform')
    }
    const skill = text('skills/website-traffic-lookup/SKILL.md')
    expect(skill).toContain('npx -y --package=vaneform-mcp@0.1.3 vaneform example.com')
    expect(skill).toContain('npm exec -y --package=vaneform-mcp@0.1.3 -- vaneform example.com')
    expect(skill).toContain('npx -p github:vaneform/vaneform-mcp vaneform example.com')
    expect(skill).toContain('npx skills add vaneform/vaneform-mcp --skill website-traffic-lookup')
    expect(skill).toContain('name: website-traffic-lookup')
  })
})
