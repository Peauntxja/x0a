import {
  createBrowser,
  createPage,
  scrapeProfile,
  scrapeTweets,
} from 'xactions/scrapers';
import { createHttpScraper } from 'xactions/scrapers/twitter/http';
import { resolveBrowserOptions } from './resolveBrowserOptions.js';
import {
  buildCookieHeader,
  loadTwitterSessionFromEnv,
  loginPageWithSession,
} from './twitterSession.js';
import { normalizeTweets } from './normalizeTweet.js';

/**
 * @param {import('puppeteer').Page} page
 * @param {string} username
 */
async function diagnoseTimeline(page, username) {
  return page.evaluate((handle) => {
    const loginPrompt = /log in|sign up|登录|注册/i.test(document.body?.innerText || '');
    return {
      title: document.title,
      url: location.href,
      tweetCount: document.querySelectorAll('article[data-testid="tweet"]').length,
      loginPrompt,
      userVisible: !!document.querySelector('[data-testid="UserName"]'),
      username: handle,
    };
  }, username);
}

/**
 * @param {{
 *   username: string,
 *   limit?: number,
 *   session?: { authToken: string, ct0: string },
 *   headless?: boolean,
 *   includeReplies?: boolean,
 *   onProgress?: (payload: { scraped: number, limit: number }) => void,
 * }} options
 */
async function scrapeViaHttp(options) {
  const { username, limit, session, includeReplies, onProgress } = options;
  const scraper = await createHttpScraper({
    cookies: buildCookieHeader(session),
  });

  const profile = await scraper.scrapeProfile(username);
  const tweets = await scraper.scrapeTweets(username, {
    limit,
    includeReplies,
    onProgress: onProgress
      ? ({ fetched, limit: max }) => onProgress({ scraped: fetched, limit: max })
      : undefined,
  });

  return { profile, tweets };
}

/**
 * @param {{
 *   username: string,
 *   limit?: number,
 *   session?: { authToken: string, ct0: string },
 *   headless?: boolean,
 *   includeReplies?: boolean,
 *   onProgress?: (payload: { scraped: number, limit: number }) => void,
 * }} options
 */
async function scrapeViaBrowser(options) {
  const { username, limit, session, headless, includeReplies, onProgress } = options;
  const browser = await createBrowser(resolveBrowserOptions({ headless }));

  try {
    const page = await createPage(browser);
    await loginPageWithSession(page, session);

    let profile = null;
    try {
      profile = await scrapeProfile(page, username);
    } catch (error) {
      console.warn(`⚠️  无法读取 @${username} 资料，将继续抓取推文: ${error.message}`);
    }

    const tweets = await scrapeTweets(page, username, {
      limit,
      includeReplies,
      onProgress,
    });

    if (tweets.length === 0) {
      const diag = await diagnoseTimeline(page, username);
      const hint = diag.loginPrompt
        ? '页面仍提示登录，请检查 auth_token 与 ct0 是否为同一浏览器会话的最新值。'
        : '时间线未加载推文，可能是账号受保护或页面结构变化。';
      throw new Error(`浏览器抓取到 0 条推文。${hint}`);
    }

    return { profile, tweets };
  } finally {
    await browser.close();
  }
}

/**
 * @param {{
 *   username: string,
 *   limit?: number,
 *   session?: { authToken: string, ct0: string } | null,
 *   headless?: boolean,
 *   includeReplies?: boolean,
 *   onProgress?: (payload: { scraped: number, limit: number }) => void,
 * }} options
 * @returns {Promise<{ profile: Record<string, unknown> | null, tweets: Array<Record<string, unknown>> }>}
 */
export async function scrapeUserTweets(options) {
  const {
    username,
    limit = 500,
    session = loadTwitterSessionFromEnv(),
    headless = true,
    includeReplies = false,
    onProgress,
  } = options;

  const progressHandler =
    onProgress ||
    ((payload) => {
      process.stdout.write(`\r抓取进度: ${payload.scraped}/${payload.limit}`);
    });

  let profile = null;
  let tweets = [];

  try {
    const result = await scrapeViaHttp({
      username,
      limit,
      session,
      includeReplies,
      onProgress: progressHandler,
    });
    profile = result.profile;
    tweets = result.tweets;
  } catch (httpError) {
    console.warn(`⚠️  HTTP 抓取失败，改用浏览器: ${httpError.message}`);
    const result = await scrapeViaBrowser({
      username,
      limit,
      session,
      headless,
      includeReplies,
      onProgress: progressHandler,
    });
    profile = result.profile;
    tweets = result.tweets;
  }

  if (!onProgress) {
    process.stdout.write('\n');
  }

  return {
    profile,
    tweets: normalizeTweets(tweets, username),
  };
}
