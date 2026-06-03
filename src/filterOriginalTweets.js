/**
 * 过滤原创推文：默认排除转推与回复。
 * @param {Array<Record<string, unknown>>} tweets
 * @param {{ includeReplies?: boolean, includeRetweets?: boolean }} options
 * @returns {Array<Record<string, unknown>>}
 */
export function filterOriginalTweets(tweets, options = {}) {
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
