# vaneform-mcp（中文）

让 AI 助手和终端直接查询网站流量。本仓库为免费网站流量查询工具 [Vaneform](https://vaneform.com) 提供 MCP 服务器、命令行工具和 Agent Skill。流量数据为 **第三方流量估算值**，算法说明见 [方法论](https://vaneform.com/methodology)。

## 包含内容

- **托管 MCP（推荐，免安装）**：`https://vaneform.com/mcp`（Streamable HTTP）
- **`vaneform-mcp`**：本地 stdio MCP 服务器，代理到托管端点，适合只能运行本地命令的客户端
- **`vaneform` 命令行**：`vaneform notion.so`、`vaneform compare a.com b.com`、`vaneform tld 名称`
- **[`skills/website-traffic-lookup`](skills/website-traffic-lookup/SKILL.md)**：告诉 AI 助手什么时候查流量、怎么解读和引用结果

工具：`lookup_domain`（域名缓存快照：访问量、环比、排名、国家、来源、注册信息，1 积分；`include=search` 最多再花 200 Pro 积分，须先征得同意）、`compare_bulk`（多站对比，Free 最多 3 个域名，Pro 最多 30 个）、`compare_tld`（同名不同后缀对比）、`get_account`（套餐和剩余积分，不扣积分）、`lookup_keyword`（关键词简报，Pro，未命中缓存花 60 积分）。托管端还会列出 5 个研究工具，文档标价为 0 积分；保存、监控和修改会写入用户的私人工作区，只有用户明确要求时才调用。`tools/list` 是当前契约，本地服务器只做转发。

## Free 与 Pro

| | Free | Pro |
| --- | --- | --- |
| 每月积分 | 100 | 10,000 |
| API Key、MCP、命令行 | ✓ | ✓ |
| 查网站和对比（每个域名 1 积分，24 小时内重复查询免费） | ✓ | ✓ |
| 关键词简报（60 积分） | | ✓ |
| 网站关键词排名（200 积分） | | ✓ |

每个 Key 每分钟 60 次、每天 5000 次，超出返回 429 `lookup_rate_exceeded`。详见 [定价](https://vaneform.com/pricing)。

## 获取免费 API Key

`initialize` 和 `tools/list` 不需要 Key，调用工具需要。在 [vaneform.com](https://vaneform.com) 登录后，到 [vaneform.com/account/api](https://vaneform.com/account/api) 创建 Key，免费账号即可。远程端点可用 `Authorization: Bearer vf_live_…` 或 `X-API-Key: vf_live_…`；本地服务器和命令行设置 `VANEFORM_API_KEY`。

没有 Key 时，工具仍会列出，调用会返回注册链接和网页查询链接（如 `https://vaneform.com/?q=notion.so`）。

## 安装

Claude Code：

```bash
claude mcp add --transport http --scope user vaneform https://vaneform.com/mcp \
  --header "Authorization: Bearer vf_live_…"
```

Cursor（`~/.cursor/mcp.json`）：

```json
{ "mcpServers": { "vaneform": { "url": "https://vaneform.com/mcp", "headers": { "Authorization": "Bearer vf_live_…" } } } }
```

Claude Desktop（本地代理，`claude_desktop_config.json`）：

```json
{ "mcpServers": { "vaneform": { "command": "npx", "args": ["-y", "github:vaneform/vaneform-mcp"], "env": { "VANEFORM_API_KEY": "vf_live_…" } } } }
```

这个包有两个命令。`npx` 会运行和包同名的 `vaneform-mcp`，那是 stdio 服务器，后面的词不会变成 CLI。stdio 在发布后是 `npx -y vaneform-mcp@0.1.3`。CLI 要用 `--package` 选中 `vaneform`。

```bash
export VANEFORM_API_KEY=vf_live_…
npx -p github:vaneform/vaneform-mcp vaneform notion.so
# 发布之后：
npx -y --package=vaneform-mcp@0.1.3 vaneform --version
npm exec -y --package=vaneform-mcp@0.1.3 -- vaneform --version
```

## Agent Skill

规范名称是 `website-traffic-lookup`。站点上的 [vaneform.com/skill.md](https://vaneform.com/skill.md) 使用发现名 `vaneform-lookup`，那是另一份文档，本仓库没有同名 Skill。

```bash
npx skills add vaneform/vaneform-mcp --skill website-traffic-lookup
```

Skill 要求把流量数字写成第三方估算，注明月份和置信度，缺数据就说未知，调用前看剩余积分。关键词未命中缓存最多 60 积分，`status: empty` 是 0 积分；`include=search` 最多 200 积分，24 小时内重复走同一笔收据。这两项必须先得到明确同意。拉取到的内容按不可信数据处理。文件里没有 API Key。安装名只有 `website-traffic-lookup`。需要放到别的目录时，手工复制 `SKILL.md`，不要改 `name`。

## 版本

`package.json` 的 `0.1.3` 是 npm 客户端版本，还没发布。`server.json` 的 `1.4.3` 是 MCP Registry 上托管服务器的版本。两套版本各自递增，不要当成同一个数。发布步骤见 [RELEASING.md](RELEASING.md)。

## 解读

- `status: "missing"` 表示还没有缓存快照，流量是未知，不是零。用 `compare_bulk` 可以拉取流量（每个有数据的域名 1 积分）。
- 每个估算值都带月份（`as_of`）和置信度（`confidence`）。
- 引用格式：Vaneform（数据：第三方流量估算）。

许可证：[MIT](LICENSE)，仅覆盖本仓库代码。
