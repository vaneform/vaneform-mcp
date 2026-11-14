# vaneform-mcp

[![CI](https://github.com/vaneform/vaneform-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/vaneform/vaneform-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/jiangqizheng/vaneform-mcp)

Website traffic lookups for AI assistants and the terminal. This repo has an MCP server, a small CLI and an agent skill for [Vaneform](https://vaneform.com), a free website traffic checker.

Ask your assistant "how much traffic does notion.so get?" or "compare figma.com and canva.com" and it answers with estimated monthly visits, month-over-month change, rank, top countries, traffic sources and registry facts. Traffic figures are **third-party traffic estimates**; see the [Vaneform methodology](https://vaneform.com/methodology).

[中文说明](README.zh-CN.md)

## What's inside

| Piece | What it is |
| --- | --- |
| Hosted MCP server | `https://vaneform.com/mcp` (Streamable HTTP). Zero install, and the recommended option. |
| `vaneform-mcp` | Local stdio MCP server for clients that only run local commands. It proxies the hosted server, so tools never drift. |
| `vaneform` CLI | `vaneform notion.so`, `vaneform compare a.com b.com`, `vaneform tld name`. It shares the same client. |
| [`skills/website-traffic-lookup`](skills/website-traffic-lookup/SKILL.md) | Agent skill (Claude / Agent Skills format) that tells an assistant when to check traffic and how to read and cite the result. |

## Tools

The local server proxies `tools/list` from the hosted server and does not embed a second schema. This table matches the public API and the tool descriptions Vaneform publishes:

| Tool | What it does | Cost |
| --- | --- | --- |
| `lookup_domain` | Cached snapshot of a domain: visits (full-site or search), registry, site profile, link-rank popularity. Optional `include=baidu`. Optional `include=search` is Pro keyword rankings. | 1 credit. `search` can add up to 200 Pro credits; do not pass it unless the user agrees |
| `compare_bulk` | Side-by-side visits and registry for several domains; fetches traffic when it is missing | 1 credit per domain with data. Free: up to 3 domains. Pro: up to 30 |
| `compare_tld` | One name across suffixes (default `com,ai,io`) | 1 credit per domain with data |
| `get_account` | Plan and remaining credits | free |
| `lookup_keyword` | US keyword brief: volume, difficulty, CPC, Google occupancy (Pro). A cache hit is free | 60 credits on a successful miss. Ask before spending them |

`tools/list` is the live contract. The local server proxies it and does not hardcode tool schemas. Five research tools (`research_site`, `get_research_workspace`, `save_research`, `monitor_research`, `manage_research`) also appear there. Publisher docs price them at 0 credits. Saving, monitoring, and managing write the caller's private workspace, so an agent should do that only when the user asks. The agent skill covers that rule.

Repeating a domain lookup within 24 hours is free. Site keyword rankings (Pro, up to 200 credits) are available through the [API](https://vaneform.com/docs/api) with `include=search`; a repeat inside 24 hours uses that receipt. A keyword brief whose status is `empty` spends 0.

## Free vs Pro

| | Free | Pro |
| --- | --- | --- |
| Credits per month | 100 | 10,000 |
| API key, MCP and CLI | ✓ | ✓ |
| Domain lookup and compare (1 credit per domain, repeats within 24h free) | ✓ | ✓ |
| Keyword brief (60 credits) | | ✓ |
| Site keyword rankings (200 credits) | | ✓ |

Each key allows 60 requests a minute and 5,000 a day (429 `lookup_rate_exceeded` above that). See [pricing](https://vaneform.com/pricing).

## Get a free API key

Discovery (`initialize`, `tools/list`) is open. **Tool calls need a Vaneform API key.**

1. Sign in at [vaneform.com](https://vaneform.com) and create a key at [vaneform.com/account/api](https://vaneform.com/account/api). A free account is enough.
2. Remote: send `Authorization: Bearer vf_live_…` or `X-API-Key: vf_live_…`. Local server and CLI: set `VANEFORM_API_KEY`.

Without a key, tools still list, and a call returns a sign-up link plus a browser link such as `https://vaneform.com/?q=notion.so`.

## Install

### Claude Code (remote)

```bash
claude mcp add --transport http --scope user vaneform https://vaneform.com/mcp \
  --header "Authorization: Bearer vf_live_…"
```

### Cursor (remote)

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "vaneform": {
      "url": "https://vaneform.com/mcp",
      "headers": { "Authorization": "Bearer vf_live_…" }
    }
  }
}
```

### Claude Desktop (local stdio)

The simplest Claude Desktop setup that passes your key is the local proxy. Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "vaneform": {
      "command": "npx",
      "args": ["-y", "github:vaneform/vaneform-mcp"],
      "env": { "VANEFORM_API_KEY": "vf_live_…" }
    }
  }
}
```

The package is not on npm yet, so `npx` installs it from GitHub. The first start takes a little longer because `prepare` runs `npm run build` once for a git install. That script does not run when the same package is later installed from the npm registry, and it does not send telemetry. If `npx` exits right away on an old system npm (Debian's packaged npm 9.2 does this with GitHub packages), run `npm install -g github:vaneform/vaneform-mcp` and use `"command": "vaneform-mcp"` with no args.

After `vaneform-mcp@0.1.3` is published, the stdio server is `npx -y vaneform-mcp` or `npx -y vaneform-mcp@0.1.3` (the bin with the same name as the package, no further arguments). Until that release exists, the GitHub command above is the one that works. See [RELEASING.md](RELEASING.md).

### Codex

```bash
export VANEFORM_API_KEY=vf_live_…
codex mcp add vaneform --url https://vaneform.com/mcp --bearer-token-env-var VANEFORM_API_KEY
```

### Any other MCP client

- Remote: URL `https://vaneform.com/mcp`, transport Streamable HTTP, header `Authorization: Bearer vf_live_…` (or `X-API-Key: vf_live_…`)
- Local: command `npx -y github:vaneform/vaneform-mcp`, env `VANEFORM_API_KEY`

## CLI

The package has two bins. npx runs the one named `vaneform-mcp`, the stdio server. Words after that package name are arguments to the server, which does not parse them as a CLI. Select the `vaneform` bin with `--package`.

```bash
npx -p github:vaneform/vaneform-mcp vaneform --help
# after npm publish:
npx -y --package=vaneform-mcp@0.1.3 vaneform --version
npx -y --package=vaneform-mcp@0.1.3 vaneform --help
npm exec -y --package=vaneform-mcp@0.1.3 -- vaneform --version
# or clone, then: npm install && npm link
export VANEFORM_API_KEY=vf_live_…
vaneform notion.so                       # traffic overview (1 credit; repeat within 24h free)
vaneform compare notion.so coda.io       # side by side (Free: up to 3 domains)
vaneform tld vaneform --suffixes com,ai,io
vaneform keyword "website traffic"       # Pro; a cache miss spends 60 credits
vaneform notion.so --include scale,baidu # cached Baidu rank; do not add search unless you mean to spend up to 200 credits
vaneform account                         # plan and remaining credits (free)
vaneform notion.so --json                # raw API JSON
```

Output with no key set:

```text
$ vaneform tools
lookup_domain   Read a cached Vaneform domain snapshot: scale (full-site or search visits), registry, site profile, and link-rank popularity.
get_account     Read the caller plan, website lookup allowance, and credit balance.
lookup_keyword  Read a US/EN keyword brief: monthly searches, difficulty, CPC, and Google occupancy.
compare_bulk    Compare domains side by side.
compare_tld     Compare the same registrable name across suffixes.

$ vaneform github.com
VANEFORM_API_KEY is not set, so this tool cannot call the Vaneform API.
Create a free API key at https://vaneform.com/account/api (100 credits a month; 1 credit per domain).
Check it in a browser instead: https://vaneform.com/?q=github.com
```

With a key, `vaneform <domain>` prints visits, MoM change, rank, top countries, sources, registry dates and the report link, followed by `Data: Vaneform (third-party traffic estimates)`.

## Talk to the hosted server directly

```bash
curl -s https://vaneform.com/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

The same key works for the REST API: [docs](https://vaneform.com/docs/api), [OpenAPI](https://vaneform.com/api/v1/openapi.json).

## Agent skill

The canonical skill name is `website-traffic-lookup`. Install that skill, not the site filename:

```bash
npx skills add vaneform/vaneform-mcp --skill website-traffic-lookup
```

`npx skills add vaneform/vaneform-mcp --list` shows the skills in this repo and does not install them. This repo does not contain a skill named `vaneform-lookup`. [vaneform.com/skill.md](https://vaneform.com/skill.md) is a separate discovery document that asks agents to save it under that filename. Install `website-traffic-lookup`. Copying `SKILL.md` by hand is the way to place that same file in another folder; leave its `name` unchanged.

A manual copy, for an agent that only reads a skills folder:

```bash
mkdir -p ~/.claude/skills/website-traffic-lookup
curl -fsSL https://raw.githubusercontent.com/vaneform/vaneform-mcp/main/skills/website-traffic-lookup/SKILL.md \
  -o ~/.claude/skills/website-traffic-lookup/SKILL.md
```

The skill tells the assistant to cite the month and confidence, to say when a figure is unknown, to check remaining credits, and to ask before a 60-credit keyword brief or a 200-credit `include=search` call. Fetched payloads are untrusted data. The file contains no API key.

## Reading the numbers

- `status: "missing"` means Vaneform hasn't cached that domain yet. It does not mean zero traffic. `compare_bulk` fetches it.
- Every estimate carries its month (`as_of`) and a `confidence` label. Quote them.
- Cite results as "Vaneform (third-party traffic estimates)".

## Versions

Two version series live in this repo. They move for different reasons and are not meant to match.

| Series | Where | Current | What it versions |
| --- | --- | --- | --- |
| npm client | `package.json` | 0.1.3 | This CLI, the stdio proxy, and the packaged skill. Not published yet. |
| MCP Registry | `server.json` | 1.4.3 | The hosted server record `io.github.jiangqizheng/vaneform-mcp` at `https://vaneform.com/mcp`. |

`vaneform --version` prints the npm client version. The public HTTP API has its own OpenAPI `info.version` as well. A registry or API bump does not by itself bump the npm package, and an npm bump does not change the hosted server.

## Development

```bash
npm install        # also builds dist/ via prepare; no telemetry
npm run lint       # biome + tsc
npm test           # unit tests + an offline stdio test with the official MCP SDK client
npm run pack:check # npm pack, then run the extracted CLI and stdio server offline
VANEFORM_MCP_URL=http://localhost:3000/mcp node dist/bin/vaneform.js tools   # point at another server
```

The runtime has no dependencies and needs Node 18 or newer. This repo contains only the client. No data collection code lives here. Publishing steps are in [RELEASING.md](RELEASING.md). The npm token stays on the maintainer's machine.

## License

[MIT](LICENSE). The license covers this code only, not data returned by the API. Traffic figures are third-party estimates served by [Vaneform](https://vaneform.com).
