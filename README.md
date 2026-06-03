# 推特博主原创推文 → Markdown 一键导出

基于 [XActions](https://github.com/nirholas/XActions) 抓取指定 X/Twitter 博主时间线，过滤转推与回复后导出为 Markdown（合并文件 + 单条文件 + 目录索引）。

## 环境要求

- Node.js 18+（推荐 20；项目含 `.node-version`，可用 [fnm](https://github.com/Schniz/fnm)：`fnm use`）
- TypeScript + [tsx](https://github.com/privatenumber/tsx) 直接运行源码
- 首次 `npm install` 会下载 Puppeteer/Chromium，体积较大

## 快速开始

```bash
npm install

# 若报错找不到 Chrome，任选其一：
# 1) 本机已装 Google Chrome 时通常可直接运行（会自动检测）
# 2) 或安装 Puppeteer 专用 Chrome：
npm run setup

# 可选：提高抓取稳定性（x.com → F12 → Application → Cookies → 同时复制 auth_token 与 ct0）
cp .env.example .env
# 编辑 .env：
# XACTIONS_AUTH_TOKEN=你的auth_token
# XACTIONS_CT0=你的ct0

# 一键下载（博主主页 URL）
npm run setup:hooks  # 启用 commit-msg 钩子，避免 Cursor 共著污染 Contributors

npm run typecheck   # TypeScript 类型检查
npm run download -- "https://x.com/karpathy"

# 或用户名 + 条数
npm run download -- karpathy --limit 200
```

## 输出结构

```
output/{username}/
├── {username}_tweets.md    # 合并 Markdown（时间倒序）
├── index.md                # 目录索引
└── tweets/
    └── {tweetId}.md        # 单条推文
```

## CLI 参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `url` / `username` | 必填 | 博主主页 URL 或 handle（可带 `@`） |
| `--limit` / `-l` | `500` | 最多抓取条数 |
| `--output` / `-o` | `./output` | 输出根目录 |
| `--include-replies` | 关闭 | 包含回复 |
| `--include-retweets` | 关闭 | 包含转推 |
| `--no-headless` | 关闭 | 显示浏览器窗口（调试用） |

## 说明与限制

- 默认抓取最近 N 条，非账号全部历史；可提高 `--limit` 或分批运行。
- 必须配置 `XACTIONS_AUTH_TOKEN` 与 `XACTIONS_CT0`（同一浏览器会话的 Cookie）；未登录时时间线为空。
- `auth_token` 是 Cookie 里的十六进制字符串，不是 JWT。
- 仅供个人备份与研究，请遵守 X/Twitter 服务条款，避免短时间高频大批量抓取。

## 许可

MIT
