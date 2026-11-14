import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const registry = JSON.parse(readFileSync(join(root, 'server.json'), 'utf8'))

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

if (pkg.name !== 'vaneform-mcp') fail(`unexpected package name: ${pkg.name}`)
if (pkg.version === registry.version) fail('npm package version and MCP Registry version must stay different series')
if (pkg.license !== 'MIT') fail('license must be MIT')
if (pkg.engines?.node !== '>=18') fail('engines.node must stay >=18')
if (pkg.scripts?.prepare !== 'npm run build') fail('prepare must stay a local/git build, with no network')
for (const hook of ['preinstall', 'install', 'postinstall']) {
  if (pkg.scripts?.[hook]) fail(`forbidden install hook: ${hook}`)
}
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) fail('runtime dependencies must stay empty')

const binJs = join(root, 'dist/bin/vaneform.js')
try {
  statSync(binJs)
} catch {
  const built = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })
  if (built.status !== 0) fail('build failed')
}

const packed = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' })
if (packed.status !== 0) fail(packed.stderr || 'npm pack failed')
const info = JSON.parse(packed.stdout)[0]
const tarball = join(root, info.filename)
const dir = mkdtempSync(join(tmpdir(), 'vaneform-pack-'))

try {
  const listed = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
  if (listed.status !== 0) fail('tar list failed')
  const files = listed.stdout.split('\n').filter(Boolean)
  const required = [
    'package/package.json',
    'package/dist/bin/vaneform.js',
    'package/dist/bin/vaneform-mcp.js',
    'package/dist/index.js',
    'package/dist/index.d.ts',
    'package/dist/client.js',
    'package/skills/website-traffic-lookup/SKILL.md',
    'package/README.md',
    'package/README.zh-CN.md',
    'package/LICENSE',
  ]
  for (const path of required) {
    if (!files.includes(path)) fail(`tarball missing ${path}`)
  }
  const forbidden = files.filter((path) =>
    /(?:^|\/)(?:node_modules|\.git|src|test|scripts)(?:\/|$)|(?:^|\/)\.env|id_rsa|credentials|server\.json|\.pem$/u.test(path),
  )
  if (forbidden.length > 0) fail(`tarball contains private or non-runtime files:\n${forbidden.join('\n')}`)

  const extracted = spawnSync('tar', ['-xzf', tarball, '-C', dir], { encoding: 'utf8' })
  if (extracted.status !== 0) fail('tar extract failed')
  const packedPkg = JSON.parse(readFileSync(join(dir, 'package/package.json'), 'utf8'))
  if (packedPkg.name !== 'vaneform-mcp' || packedPkg.version !== pkg.version) fail('packed name or version mismatch')
  if (packedPkg.bin?.vaneform !== 'dist/bin/vaneform.js' || packedPkg.bin?.['vaneform-mcp'] !== 'dist/bin/vaneform-mcp.js') {
    fail('packed bin entries changed')
  }
  for (const hook of ['preinstall', 'install', 'postinstall']) {
    if (packedPkg.scripts?.[hook]) fail(`packed package has install hook ${hook}`)
  }

  function walk(path, found = []) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name)
      if (entry.isDirectory()) walk(child, found)
      else found.push(child)
    }
    return found
  }
  const secret = /vf_live_[A-Za-z0-9]{8,}|BEGIN [A-Z ]*PRIVATE KEY|NPM_TOKEN|_authToken/u
  for (const file of walk(join(dir, 'package'))) {
    const text = readFileSync(file, 'utf8')
    if (secret.test(text)) fail(`possible secret in ${file}`)
  }
  for (const name of ['vaneform.js', 'vaneform-mcp.js']) {
    const text = readFileSync(join(dir, 'package/dist/bin', name), 'utf8')
    if (!text.startsWith('#!/usr/bin/env node\n')) fail(`${name} is missing the node shebang`)
  }

  const cleanEnv = { ...process.env, VANEFORM_API_KEY: '', VANEFORM_MCP_URL: 'http://127.0.0.1:9/mcp' }
  delete cleanEnv.NPM_TOKEN
  delete cleanEnv.NODE_AUTH_TOKEN
  const version = spawnSync(process.execPath, [join(dir, 'package/dist/bin/vaneform.js'), '--version'], {
    encoding: 'utf8',
    env: cleanEnv,
  })
  if (version.status !== 0 || version.stdout.trim() !== pkg.version) fail(`--version returned ${version.stdout.trim()}`)
  const help = spawnSync(process.execPath, [join(dir, 'package/dist/bin/vaneform.js'), '--help'], {
    encoding: 'utf8',
    env: cleanEnv,
  })
  if (help.status !== 0 || !help.stdout.includes('vaneform compare') || !help.stdout.includes('60 credits')) {
    fail('extracted CLI --help is incomplete')
  }
  const missing = spawnSync(process.execPath, [join(dir, 'package/dist/bin/vaneform.js'), 'github.com'], {
    encoding: 'utf8',
    env: cleanEnv,
  })
  if (missing.status !== 2 || !missing.stderr.includes('https://vaneform.com/?q=github.com')) {
    fail(`missing-key path did not stay offline (exit ${missing.status})`)
  }

  const init = spawnSync(
    process.execPath,
    [join(dir, 'package/dist/bin/vaneform-mcp.js')],
    {
      encoding: 'utf8',
      env: cleanEnv,
      input: `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'pack-smoke', version: '0' } },
      })}\n`,
    },
  )
  if (!init.stdout.includes('"name":"vaneform"') || !init.stdout.includes('third-party estimates')) {
    fail('extracted stdio server did not complete initialize')
  }

  const app = mkdtempSync(join(tmpdir(), 'vaneform-install-'))
  try {
    writeFileSync(join(app, 'package.json'), '{"private":true}\n')
    const installed = spawnSync(
      'npm',
      ['install', '--omit=dev', '--ignore-scripts', '--no-fund', '--no-audit', '--offline', tarball],
      { cwd: app, encoding: 'utf8', env: cleanEnv },
    )
    if (installed.status !== 0) fail(`npm install of the tarball failed\n${installed.stderr}`)
    const linked = spawnSync(join(app, 'node_modules/.bin/vaneform'), ['--version'], { encoding: 'utf8', env: cleanEnv })
    if (linked.status !== 0 || linked.stdout.trim() !== pkg.version) {
      fail(`installed vaneform bin failed (${linked.status}): ${linked.stderr}`)
    }
    const proxy = spawnSync(join(app, 'node_modules/.bin/vaneform-mcp'), [], {
      encoding: 'utf8',
      env: cleanEnv,
      input: `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'install-smoke', version: '0' } },
      })}\n`,
    })
    if (!proxy.stdout.includes('"name":"vaneform"')) fail('installed vaneform-mcp bin did not answer initialize')
  } finally {
    rmSync(app, { recursive: true, force: true })
  }
  process.stdout.write(`pack smoke ok: ${info.filename} (${info.size} bytes, ${files.length} files)\n`)
} finally {
  rmSync(tarball, { force: true })
  rmSync(dir, { recursive: true, force: true })
}
