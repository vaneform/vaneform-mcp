import { ATTRIBUTION, SIGN_UP_URL, VaneformClient, VaneformError, VERSION } from './client.js'
import { formatAccount, formatCompare, formatDomain, formatKeyword } from './format.js'

const HELP = `vaneform ${VERSION} — website traffic lookups from the terminal (${ATTRIBUTION})

Usage
  vaneform <domain> [--include families]
                                        Cached snapshot. Omit --include for the server default.
                                        Adding search can spend 200 Pro credits. baidu is cache-only.
  vaneform compare <domain> <domain>…   Compare sites (1 credit per domain with data; Free max 3, Pro max 30)
  vaneform tld <name> [--suffixes com,ai,io]
                                        Compare one name across suffixes
  vaneform keyword <query>              Pro US/EN keyword brief. A cache miss spends 60 credits.
  vaneform account                      Plan and remaining credits (spends 0)
  vaneform tools                        List the hosted MCP tools

Options
  --json                 Print the raw API JSON
  --include <families>   Domain lookup only. Comma-separated: scale,registry,profile,popularity,baidu,search
  --suffixes <list>      Suffixes for tld (default com,ai,io)
  --help                 Show this help
  --version              Show the npm package version (not the MCP Registry version)

Environment
  VANEFORM_API_KEY   API key from ${SIGN_UP_URL} (free accounts: 100 credits a month).
                     The CLI never stores the key. Without a key, it prints a browser link.
  VANEFORM_MCP_URL   Override the hosted MCP endpoint (default https://vaneform.com/mcp).`

type Out = { stdout: (text: string) => void; stderr: (text: string) => void }

const defaultOut: Out = {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
}

const VALUE_FLAGS = ['--suffixes', '--include']

function parseArgs(argv: string[]) {
  const flags = new Set<string>()
  const values = new Map<string, string>()
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const eq = arg.indexOf('=')
    const name = eq === -1 ? arg : arg.slice(0, eq)
    if (VALUE_FLAGS.includes(name)) {
      const value = eq === -1 ? argv[i + 1] : arg.slice(eq + 1)
      if (eq === -1 && value && !value.startsWith('--')) i++
      if (value && !value.startsWith('--')) values.set(name, value)
      continue
    }
    if (eq === -1) flags.add(name)
  }
  return { flags, values, positional }
}

export async function runCli(argv: string[], client: VaneformClient = VaneformClient.fromEnv(), out: Out = defaultOut): Promise<number> {
  const { flags, values, positional } = parseArgs(argv)
  const suffixes = values.get('--suffixes')
  const include = values.get('--include')
  const json = flags.has('--json')

  if (flags.has('--version')) {
    out.stdout(VERSION)
    return 0
  }
  const [command, ...rest] = positional
  if (flags.has('--help') || !command) {
    out.stdout(HELP)
    return command || flags.has('--help') ? 0 : 1
  }

  try {
    if (command === 'tools') {
      const tools = await client.listTools()
      out.stdout(
        json
          ? JSON.stringify(tools, null, 2)
          : tools.map((tool) => `${tool.name.padEnd(16)}${(tool.description ?? '').split('. ')[0]}.`).join('\n'),
      )
      return 0
    }
    if (command === 'account') {
      const body = await client.callJson('get_account')
      out.stdout(json ? JSON.stringify(body, null, 2) : formatAccount(body))
      return 0
    }
    if (command === 'compare') {
      if (rest.length === 0) {
        out.stderr('Usage: vaneform compare <domain> <domain>…')
        return 1
      }
      const body = await client.callJson('compare_bulk', { q: rest.join(',') })
      out.stdout(json ? JSON.stringify(body, null, 2) : formatCompare(body))
      return 0
    }
    if (command === 'tld') {
      const name = rest[0]
      if (!name) {
        out.stderr('Usage: vaneform tld <name> [--suffixes com,ai,io]')
        return 1
      }
      const body = await client.callJson('compare_tld', suffixes ? { q: name, s: suffixes } : { q: name })
      out.stdout(json ? JSON.stringify(body, null, 2) : formatCompare(body))
      return 0
    }
    if (command === 'keyword') {
      const q = rest.join(' ').trim()
      if (!q) {
        out.stderr('Usage: vaneform keyword <query>  (Pro; a cache miss spends 60 credits)')
        return 1
      }
      const body = await client.callJson('lookup_keyword', { q })
      out.stdout(json ? JSON.stringify(body, null, 2) : formatKeyword(body))
      return 0
    }
    const domain = command === 'lookup' ? rest[0] : command
    if (!domain) {
      out.stderr('Usage: vaneform <domain>')
      return 1
    }
    const body = await client.callJson('lookup_domain', include ? { domain, include } : { domain })
    out.stdout(json ? JSON.stringify(body, null, 2) : formatDomain(body))
    return 0
  } catch (error) {
    if (error instanceof VaneformError) {
      out.stderr(error.message)
      return error.code === 'missing_api_key' ? 2 : 1
    }
    throw error
  }
}
