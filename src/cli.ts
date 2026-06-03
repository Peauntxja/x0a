#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProfileUrl } from './parseProfileUrl.js';
import { scrapeUserTweets } from './scrapeUserTweets.js';
import { filterOriginalTweets } from './filterOriginalTweets.js';
import { exportMarkdown } from './exportMarkdown.js';
import {
  loadTwitterSessionFromEnv,
  validateTwitterSession,
} from './twitterSession.js';
import type { CliOptions } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(): void {
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) {
      process.env[key] = value;
    }
  }
}

function printHelp(): void {
  console.log(`用法:
  npm run download -- <主页URL或用户名> [选项]

选项:
  -l, --limit <数量>        最多抓取条数 (默认: 500)
  -o, --output <目录>       输出根目录 (默认: ./output)
      --include-replies     包含回复
      --include-retweets    包含转推
      --no-headless         显示浏览器窗口
  -h, --help                显示帮助

示例:
  npm run download -- "https://x.com/karpathy"
  npm run download -- karpathy --limit 200
`);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    target: null,
    limit: 500,
    output: path.join(projectRoot, 'output'),
    includeReplies: false,
    includeRetweets: false,
    headless: true,
    help: false,
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--include-replies') {
      options.includeReplies = true;
      continue;
    }

    if (arg === '--include-retweets') {
      options.includeRetweets = true;
      continue;
    }

    if (arg === '--no-headless') {
      options.headless = false;
      continue;
    }

    if (arg === '--limit' || arg === '-l') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--limit 需要指定数值');
      }
      options.limit = Number(next);
      i += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.slice('--limit='.length));
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--output 需要指定目录');
      }
      options.output = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.output = path.resolve(arg.slice('--output='.length));
      continue;
    }

    positional.push(arg);
  }

  if (positional.length > 0) {
    options.target = positional[0];
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) {
    throw new Error('--limit 必须是大于 0 的数字');
  }

  return options;
}

async function main(): Promise<void> {
  loadEnvFile();

  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.target) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const username = parseProfileUrl(options.target);
  const session = loadTwitterSessionFromEnv();
  const sessionIssues = validateTwitterSession(session);

  console.log(`开始抓取 @${username} 的推文 (limit=${options.limit})`);

  if (sessionIssues.length > 0) {
    console.error('登录配置不完整，X 现已要求登录后才能查看推文时间线：');
    for (const issue of sessionIssues) {
      console.error(`  - ${issue}`);
    }
    console.error('');
    console.error('请编辑 .env，填入 x.com Cookies 中的 auth_token 与 ct0，然后重试。');
    console.error('参考: cp .env.example .env');
    process.exitCode = 1;
    return;
  }

  const { profile, tweets: rawTweets } = await scrapeUserTweets({
    username,
    limit: options.limit,
    session,
    headless: options.headless,
    includeReplies: options.includeReplies,
  });

  console.log(`原始抓取: ${rawTweets.length} 条`);

  const tweets = filterOriginalTweets(rawTweets, {
    includeReplies: options.includeReplies,
    includeRetweets: options.includeRetweets,
  });

  console.log(`过滤后原创: ${tweets.length} 条`);

  if (tweets.length === 0) {
    console.warn('未获得可导出的推文。请确认：');
    console.warn('  1) .env 中 auth_token 与 ct0 来自同一浏览器会话且未过期');
    console.warn('  2) auth_token 是 Cookie 值（十六进制），不是 JWT');
    console.warn('  3) 可尝试 --no-headless 观察浏览器是否已登录');
    process.exitCode = 1;
    return;
  }

  const result = await exportMarkdown({
    profile,
    tweets,
    username,
    limit: options.limit,
    outputRoot: options.output,
  });

  console.log('导出完成:');
  console.log(`  目录: ${result.outDir}`);
  console.log(`  合并: ${result.mergedFile}`);
  console.log(`  索引: ${result.indexFile}`);
  console.log(`  单条: ${path.join(result.outDir, 'tweets')} (${result.tweetCount} 个文件)`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`错误: ${message}`);
  process.exitCode = 1;
});
