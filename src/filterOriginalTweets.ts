import type { FilterOptions, Tweet } from './types.js';

export function filterOriginalTweets(
  tweets: Tweet[],
  options: FilterOptions = {}
): Tweet[] {
  const { includeReplies = false, includeRetweets = false } = options;

  return tweets.filter((tweet) => {
    if (!includeRetweets && tweet.isRetweet) {
      return false;
    }
    if (!includeReplies && tweet.isReply) {
      return false;
    }
    return true;
  });
}
