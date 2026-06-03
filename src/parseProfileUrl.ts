export function parseProfileUrl(input: string): string {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('请提供博主主页 URL 或用户名');
  }

  let value = trimmed.replace(/^@/, '');

  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '');
      if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(host)) {
        throw new Error('仅支持 x.com / twitter.com 链接');
      }
      const segments = url.pathname.split('/').filter(Boolean);
      if (!segments.length) {
        throw new Error('无法从 URL 解析用户名');
      }
      value = segments[0];
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('无效的 URL 格式');
    }
    throw error;
  }

  const username = value.replace(/^@/, '').trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) {
    throw new Error(`无效的用户名: ${username}`);
  }

  return username;
}
