import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const skillPath = new URL('../skills/website-traffic-lookup/SKILL.md', import.meta.url)
const skill = readFileSync(skillPath, 'utf8')
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''

function field(key: string): string {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return (match?.[1] ?? '').replace(/^["']|["']$/g, '')
}

describe('website-traffic-lookup skill', () => {
  it('keeps the canonical name and matches the Agent Skills frontmatter rules', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(readdirSync(new URL('../skills', import.meta.url))).toEqual(['website-traffic-lookup'])
    expect(field('name')).toBe('website-traffic-lookup')
    expect(field('name')).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    expect(field('license')).toBe('MIT')
    expect(field('description').length).toBeGreaterThan(0)
    expect(field('description').length).toBeLessThanOrEqual(1024)
    expect(field('compatibility').length).toBeGreaterThan(0)
    expect(field('compatibility').length).toBeLessThanOrEqual(500)
    expect(frontmatter).toContain(`version: "${pkg.version}"`)
    expect(frontmatter).toContain('site-discovery-name: vaneform-lookup')
    expect(skill.startsWith('---\n')).toBe(true)
  })

  it('documents install, estimates, consent, unknown data, and untrusted payloads', () => {
    expect(skill).toContain('npx skills add vaneform/vaneform-mcp --skill website-traffic-lookup')
    expect(skill).toContain('npx skills add vaneform/vaneform-mcp --list')
    expect(skill).toContain('https://vaneform.com/skill.md')
    expect(skill).toContain('third-party traffic estimates')
    expect(skill).toContain('as_of')
    expect(skill).toContain('status: "missing"')
    expect(skill).toContain('get_account')
    expect(skill).toContain('60 credits')
    expect(skill).toContain('200 credits')
    expect(skill).toContain('explicitly agrees')
    expect(skill).toContain('untrusted')
    expect(skill).toContain('VANEFORM_API_KEY')
    expect(skill).not.toMatch(/vf_live_[A-Za-z0-9]{8,}/u)
  })
})
