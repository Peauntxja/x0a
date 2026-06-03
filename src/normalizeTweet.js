/**
 * @param {unknown} value
 */
function parseMetric(value) {
  if (value == null || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const text = String(value).trim().replace(/,/g, '');
  if (text.endsWith('K')) {
    return Math.round(parseFloat(text) * 1000);
  }
  if (text.endsWith('M')) {
    return Math.round(parseFloat(text) * 1000000);
  }
  if (text.endsWith('B')) {
    return Math.round(parseFloat(text) * 1000000000);
  }
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 统一 HTTP / Puppeteer 两种抓取结果的字段。
 * @param {Record<string, unknown>} tweet
 * @param {string} username
 * @returns {Record<string, unknown>}
 */
export function normalizeTweet(tweet, username) {
  const author =
    (tweet.author && typeof tweet.author === 'object' && tweet.author.username) ||
    tweet.author ||
    username;
  const id = tweet.id != null ? String(tweet.id) : null;
  const metrics =
    tweet.metrics && typeof tweet.metrics === 'object' ? tweet.metrics : {};

  let media = [];
  if (Array.isArray(tweet.media)) {
    media = tweet.media;
  } else if (tweet.media && typeof tweet.media === 'object') {
    const images = Array.isArray(tweet.media.images) ? tweet.media.images : [];
    media = images.map((url) => ({ type: 'image', url }));
    if (tweet.media.hasVideo) {
      media.push({ type: 'video', url: null });
    }
  }

  return {
    ...tweet,
    id,
    text: typeof tweet.text === 'string' ? tweet.text : '',
    timestamp:
      (typeof tweet.timestamp === 'string' && tweet.timestamp) ||
      (typeof tweet.createdAt === 'string' && tweet.createdAt) ||
      null,
    likes: parseMetric(tweet.likes ?? metrics.likes),
    retweets: parseMetric(tweet.retweets ?? metrics.retweets),
    replies: parseMetric(tweet.replies ?? metrics.replies),
    views: parseMetric(tweet.views ?? metrics.views),
    isRetweet: Boolean(tweet.isRetweet),
    isReply: Boolean(tweet.isReply),
    author,
    media,
    url:
      (typeof tweet.url === 'string' && tweet.url) ||
      (id ? `https://x.com/${author}/status/${id}` : null),
  };
}

/**
 * @param {Array<Record<string, unknown>>} tweets
 * @param {string} username
 */
export function normalizeTweets(tweets, username) {
  return tweets.map((tweet) => normalizeTweet(tweet, username));
}
