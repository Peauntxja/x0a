import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ExportMarkdownParams,
  ExportResult,
  Profile,
  Tweet,
} from './types.js';

function summarize(text: string, maxLen = 60): string {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '(无正文)';
  }
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return `${normalized.slice(0, maxLen)}…`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '未知日期';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString();
}

function buildTweetUrl(tweet: Tweet, username: string): string {
  if (tweet.url) {
    return tweet.url;
  }
  return `https://x.com/${tweet.author || username}/status/${tweet.id}`;
}

function renderTweetBody(tweet: Tweet, username: string): string {
  const lines: string[] = [];
  const timestamp = formatDate(tweet.timestamp);
  const summary = summarize(tweet.text);

  lines.push(`## ${timestamp} — ${summary}`);
  lines.push('');
  lines.push(tweet.text);
  lines.push('');
  lines.push(
    `- 点赞: ${tweet.likes} | 转推: ${tweet.retweets} | 回复: ${tweet.replies} | 浏览: ${tweet.views}`
  );
  lines.push(`- 链接: ${buildTweetUrl(tweet, username)}`);

  if (tweet.media.length > 0) {
    lines.push('');
    lines.push('### 媒体');
    for (const item of tweet.media) {
      if (!item.url) {
        continue;
      }
      if (item.type === 'image') {
        lines.push(`![](${item.url})`);
      } else {
        lines.push(`- [${item.type}](${item.url})`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

function resolveProfileName(profile: Profile | null, username: string): string {
  if (profile?.name) {
    return profile.name;
  }
  if (profile?.displayName) {
    return profile.displayName;
  }
  return username;
}

export async function exportMarkdown({
  profile,
  tweets,
  username,
  limit,
  outputRoot,
}: ExportMarkdownParams): Promise<ExportResult> {
  const outDir = path.join(outputRoot, username);
  const tweetsDir = path.join(outDir, 'tweets');
  await fs.mkdir(tweetsDir, { recursive: true });

  const sorted = [...tweets].sort((a, b) => {
    const ta = new Date(String(a.timestamp || 0)).getTime();
    const tb = new Date(String(b.timestamp || 0)).getTime();
    return tb - ta;
  });

  const profileName = resolveProfileName(profile, username);
  const exportedAt = new Date().toISOString();

  const mergedHeader = [
    `# @${username} 原创推文归档`,
    '',
    `> 博主: ${profileName}`,
    `> 抓取时间: ${exportedAt}`,
    `> 请求上限: ${limit}`,
    `> 导出条数: ${sorted.length}`,
    '',
    '---',
    '',
  ].join('\n');

  const mergedSections = sorted.map((tweet) => renderTweetBody(tweet, username));
  const mergedFile = path.join(outDir, `${username}_tweets.md`);
  await fs.writeFile(mergedFile, mergedHeader + mergedSections.join('\n'), 'utf8');

  for (const tweet of sorted) {
    const id = String(tweet.id || 'unknown');
    const singleHeader = [
      `# 推文 ${id}`,
      '',
      `> 博主: @${username}`,
      `> 日期: ${formatDate(tweet.timestamp)}`,
      '',
      '---',
      '',
    ].join('\n');
    const singleFile = path.join(tweetsDir, `${id}.md`);
    await fs.writeFile(
      singleFile,
      singleHeader + renderTweetBody(tweet, username),
      'utf8'
    );
  }

  const indexLines = [
    `# @${username} 推文索引`,
    '',
    `抓取时间: ${exportedAt}`,
    '',
    `共 ${sorted.length} 条原创推文。`,
    '',
    '| 日期 | 摘要 | 文件 | 互动 |',
    '| --- | --- | --- | --- |',
  ];

  for (const tweet of sorted) {
    const id = String(tweet.id || 'unknown');
    const date = formatDate(tweet.timestamp);
    const summary = summarize(tweet.text, 40);
    const engagement = `❤ ${tweet.likes} · 🔁 ${tweet.retweets} · 💬 ${tweet.replies}`;
    indexLines.push(
      `| ${date} | ${summary.replace(/\|/g, '\\|')} | [${id}](tweets/${id}.md) | ${engagement} |`
    );
  }

  const indexFile = path.join(outDir, 'index.md');
  await fs.writeFile(indexFile, `${indexLines.join('\n')}\n`, 'utf8');

  return {
    outDir,
    mergedFile,
    indexFile,
    tweetCount: sorted.length,
  };
}
