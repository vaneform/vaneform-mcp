# Releasing vaneform-mcp to npm

This checklist is for the maintainer who owns the npm account. This repository does not contain an npm token, and GitHub access to `vaneform/vaneform-mcp` does not grant permission to publish. Do not add `NPM_TOKEN` to the VM, the workflow, or the repo.

## Versions

| Series | File | Meaning |
| --- | --- | --- |
| npm client `0.1.x` | `package.json` | The CLI, stdio proxy, and packaged skill. `vaneform --version` prints this. |
| MCP Registry `1.4.x` | `server.json` | Hosted server record `io.github.jiangqizheng/vaneform-mcp`. |

Do not set them to the same number. The public OpenAPI `info.version` is a third series and is not edited here.

`0.1.3` is the first version prepared for the npm registry. `0.1.2` exists only as a git revision; it was never published. On 2026-11-14, `npm view vaneform-mcp` and `https://registry.npmjs.org/vaneform-mcp` both returned 404. Re-check immediately before publishing. The first successful publish claims the name `vaneform-mcp`.

## What is already true

- Package name in `package.json`: `vaneform-mcp` (unscoped, `publishConfig.access` `public`).
- Runtime dependencies: none. Node `>=18`.
- Bins: `vaneform` and `vaneform-mcp`, with a `#!/usr/bin/env node` shebang.
- `prepare` is `npm run build`. npm runs it for a local install, a git install, and before `npm pack` / `npm publish`. npm does not run it when a user installs the registry tarball. It compiles TypeScript and does not open a network connection or send telemetry.
- There is no `preinstall`, `install`, or `postinstall`.
- `prepublishOnly` runs `npm run lint && npm test` on the maintainer's `npm publish`. It does not run for people who install the package.
- Trusted publishing is not configured. There is no publish workflow on purpose. A GitHub Actions OIDC publisher has to be created on npmjs.com by the package owner after the package exists. Do not add that workflow until the npm setting is actually there.

## Before publish

From a clean checkout of the reviewed commit, on a machine you control:

```bash
npm ci
npm test
npm run pack:check
npm pack --dry-run
```

`pack:check` builds if `dist/` is missing, packs with `--ignore-scripts`, and runs the extracted tarball offline:

- `vaneform --version` prints `0.1.3`
- `vaneform --help` works
- `vaneform github.com` with no key exits 2 and prints a browser link, against an endpoint that refuses connections
- `vaneform-mcp` answers MCP `initialize`

Open the tarball listing and confirm it contains `dist/`, `skills/website-traffic-lookup/SKILL.md`, both READMEs, and `LICENSE`. It must not contain `.env`, tests, `src/`, tokens, or private keys.

## Publish

On the maintainer's machine, after the checks above, with the npm credentials that should own the name:

```bash
npm whoami
npm publish --access public
```

`prepublishOnly` runs the tests again. Do not pass a token on the command line. Do not put a token in this repo. `npm publish --provenance` only works from a CI environment that can sign; a laptop publish will not create GitHub provenance. That is expected for this first release.

## After publish

```bash
npm view vaneform-mcp version
npx -y vaneform-mcp@0.1.3 vaneform --version
```

The second command should print `0.1.3` and should not need `VANEFORM_API_KEY`. Then the README's "after npm publish" commands are live. The GitHub install (`npx -y github:vaneform/vaneform-mcp`) stays valid.

Optional, only after the package exists and you are logged in as its owner: on npmjs.com, add a GitHub Actions trusted publisher for `vaneform/vaneform-mcp`. A later change can add a workflow. This release does not add one.

Do not submit the skill to skills.sh from the release script. The install command is already `npx skills add vaneform/vaneform-mcp --skill website-traffic-lookup`.
