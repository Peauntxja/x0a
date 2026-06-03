import type { RawTweet, Tweet, TweetMedia } from './types.js';

function parseMetric(value: unknown): number {
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

function resolveAuthor(tweet: RawTweet, username: string): string {
  const author = tweet.author;
  if (author && typeof author === 'object' && author !== null) {
    const authorRecord = author as Record<string, unknown>;
    if (typeof authorRecord.username === 'string') {
      return authorRecord.username;
    }
  }
  if (typeof author === 'string') {
    return author;
  }
  return username;
}

function resolveMedia(tweet: RawTweet): TweetMedia[] {
  if (Array.isArray(tweet.media)) {
    return tweet.media
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        type: typeof item.type === 'string' ? item.type : 'media',
        url: typeof item.url === 'string' ? item.url : null,
      }));
  }

  if (tweet.media && typeof tweet.media === 'object') {
    const mediaRecord = tweet.media as Record<string, unknown>;
    const images = Array.isArray(mediaRecord.images) ? mediaRecord.images : [];
    const media: TweetMedia[] = images
      .filter((url): url is string => typeof url === 'string')
      .map((url) => ({ type: 'image', url }));

    if (mediaRecord.hasVideo) {
      media.push({ type: 'video', url: null });
    }
    return media;
  }

  return [];
}

function resolveMetrics(tweet: RawTweet): Record<string, unknown> {
  if (tweet.metrics && typeof tweet.metrics === 'object') {
    return tweet.metrics as Record<string, unknown>;
  }
  return {};
}

export function normalizeTweet(tweet: RawTweet, username: string): Tweet {
  const author = resolveAuthor(tweet, username);
  const id = tweet.id != null ? String(tweet.id) : null;
  const metrics = resolveMetrics(tweet);
  const media = resolveMedia(tweet);

  return {
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

export function normalizeTweets(tweets: RawTweet[], username: string): Tweet[] {
  return tweets.map((tweet) => normalizeTweet(tweet, username));
}
