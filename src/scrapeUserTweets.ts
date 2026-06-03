import {
  createBrowser,
  createPage,
  scrapeProfile,
  scrapeTweets,
} from 'xactions/scrapers';
import { createHttpScraper } from 'xactions/scrapers/twitter/http';
import type { Page } from 'puppeteer';
import { resolveBrowserOptions } from './resolveBrowserOptions.js';
import {
  buildCookieHeader,
  loadTwitterSessionFromEnv,
  loginPageWithSession,
} from './twitterSession.js';
import { normalizeTweets } from './normalizeTweet.js';
import type {
  Profile,
  RawTweet,
  ScrapeProgress,
  ScrapeUserTweetsOptions,
  TwitterSession,
} from './types.js';

interface TimelineDiagnostic {
  title: string;
  url: string;
  tweetCount: number;
  loginPrompt: boolean;
  userVisible: boolean;
  username: string;
}

interface ScrapeViaHttpOptions {
  username: string;
  limit: number;
  session: TwitterSession;
  includeReplies: boolean;
  onProgress?: (payload: ScrapeProgress) => void;
}

interface ScrapeViaBrowserOptions extends ScrapeViaHttpOptions {
  headless: boolean;
}

async function diagnoseTimeline(
  page: Page,
  username: string
): Promise<TimelineDiagnostic> {
  return page.evaluate((handle: string) => {
    const loginPrompt = /log in|sign up|登录|注册/i.test(
      document.body?.innerText || ''
    );
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

async function scrapeViaHttp(
  options: ScrapeViaHttpOptions
): Promise<{ profile: Profile; tweets: RawTweet[] }> {
  const { username, limit, session, includeReplies, onProgress } = options;
  const scraper = await createHttpScraper({
    cookies: buildCookieHeader(session),
  });

  const profile = (await scraper.scrapeProfile(username)) as Profile;
  const tweets = (await scraper.scrapeTweets(username, {
    limit,
    includeReplies,
    onProgress: onProgress
      ? ({ fetched, limit: max }: { fetched: number; limit: number }) =>
          onProgress({ scraped: fetched, limit: max })
      : undefined,
  })) as RawTweet[];

  return { profile, tweets };
}

async function scrapeViaBrowser(
  options: ScrapeViaBrowserOptions
): Promise<{ profile: Profile | null; tweets: RawTweet[] }> {
  const { username, limit, session, headless, includeReplies, onProgress } =
    options;
  const browser = await createBrowser(resolveBrowserOptions({ headless }));

  try {
    const page = await createPage(browser);
    await loginPageWithSession(page, session);

    let profile: Profile | null = null;
    try {
      profile = (await scrapeProfile(page, username)) as Profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️  无法读取 @${username} 资料，将继续抓取推文: ${message}`);
    }

    const tweets = (await scrapeTweets(page, username, {
      limit,
      includeReplies,
      onProgress,
    })) as RawTweet[];

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

export async function scrapeUserTweets(
  options: ScrapeUserTweetsOptions
): Promise<{ profile: Profile | null; tweets: ReturnType<typeof normalizeTweets> }> {
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
    ((payload: ScrapeProgress) => {
      process.stdout.write(`\r抓取进度: ${payload.scraped}/${payload.limit}`);
    });

  let profile: Profile | null = null;
  let tweets: RawTweet[] = [];

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
    const message =
      httpError instanceof Error ? httpError.message : String(httpError);
    console.warn(`⚠️  HTTP 抓取失败，改用浏览器: ${message}`);
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
