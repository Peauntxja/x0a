import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} text
 * @param {number} maxLen
 */
function summarize(text, maxLen = 60) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '(无正文)';
  }
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return `${normalized.slice(0, maxLen)}…`;
}

/**
 * @param {string | undefined | null} value
 */
function formatDate(value) {
  if (!value) {
    return '未知日期';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString();
}

/**
 * @param {Record<string, unknown>} tweet
 * @param {string} username
 */
function buildTweetUrl(tweet, username) {
  if (typeof tweet.url === 'string' && tweet.url) {
    return tweet.url;
  }
  const id = tweet.id;
  const author = tweet.author || username;
  return `https://x.com/${author}/status/${id}`;
}

/**
 * @param {Record<string, unknown>} tweet
 * @param {string} username
 */
function renderTweetBody(tweet, username) {
  const lines = [];
  const timestamp = formatDate(
    typeof tweet.timestamp === 'string' ? tweet.timestamp : undefined
  );
  const summary = summarize(typeof tweet.text === 'string' ? tweet.text : '');

  lines.push(`## ${timestamp} — ${summary}`);
  lines.push('');
  lines.push(typeof tweet.text === 'string' ? tweet.text : '');
  lines.push('');
  lines.push(
    `- 点赞: ${tweet.likes ?? 0} | 转推: ${tweet.retweets ?? 0} | 回复: ${tweet.replies ?? 0} | 浏览: ${tweet.views ?? 0}`
  );
  lines.push(`- 链接: ${buildTweetUrl(tweet, username)}`);

  const media = Array.isArray(tweet.media) ? tweet.media : [];
  if (media.length > 0) {
    lines.push('');
    lines.push('### 媒体');
    for (const item of media) {
      const type = item && typeof item === 'object' ? item.type : 'media';
      const url = item && typeof item === 'object' ? item.url : null;
      if (!url) {
        continue;
      }
      if (type === 'image') {
        lines.push(`![](${url})`);
      } else {
        lines.push(`- [${type}](${url})`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * @param {{
 *   profile: Record<string, unknown> | null,
 *   tweets: Array<Record<string, unknown>>,
 *   username: string,
 *   limit: number,
 *   outputRoot: string,
 * }} params
 * @returns {Promise<{ outDir: string, mergedFile: string, indexFile: string, tweetCount: number }>}
 */
export async function exportMarkdown({
  profile,
  tweets,
  username,
  limit,
  outputRoot,
}) {
  const outDir = path.join(outputRoot, username);
  const tweetsDir = path.join(outDir, 'tweets');
  await fs.mkdir(tweetsDir, { recursive: true });

  const sorted = [...tweets].sort((a, b) => {
    const ta = new Date(String(a.timestamp || 0)).getTime();
    const tb = new Date(String(b.timestamp || 0)).getTime();
    return tb - ta;
  });

  const profileName =
    (profile && typeof profile.name === 'string' && profile.name) ||
    (profile && typeof profile.displayName === 'string' && profile.displayName) ||
    username;
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
      `> 日期: ${formatDate(typeof tweet.timestamp === 'string' ? tweet.timestamp : undefined)}`,
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
    const date = formatDate(typeof tweet.timestamp === 'string' ? tweet.timestamp : undefined);
    const summary = summarize(typeof tweet.text === 'string' ? tweet.text : '', 40);
    const engagement = `❤ ${tweet.likes ?? 0} · 🔁 ${tweet.retweets ?? 0} · 💬 ${tweet.replies ?? 0}`;
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
