declare module 'xactions/scrapers' {
  import type { Browser, Page } from 'puppeteer';

  export interface BrowserLaunchOptions {
    headless?: boolean | 'new';
    executablePath?: string;
    adapter?: string;
    [key: string]: unknown;
  }

  export function createBrowser(options?: BrowserLaunchOptions): Promise<Browser>;
  export function createPage(browser: Browser, options?: Record<string, unknown>): Promise<Page>;
  export function scrapeProfile(page: Page, username: string): Promise<Record<string, unknown>>;
  export function scrapeTweets(
    page: Page,
    username: string,
    options?: {
      limit?: number;
      includeReplies?: boolean;
      onProgress?: (payload: { scraped: number; limit: number }) => void;
    }
  ): Promise<Array<Record<string, unknown>>>;
}

declare module 'xactions/scrapers/twitter/http' {
  export interface HttpScraper {
    scrapeProfile(username: string): Promise<Record<string, unknown>>;
    scrapeTweets(
      username: string,
      options?: {
        limit?: number;
        includeReplies?: boolean;
        onProgress?: (payload: { fetched: number; limit: number }) => void;
      }
    ): Promise<Array<Record<string, unknown>>>;
  }

  export function createHttpScraper(options?: {
    cookies?: string;
    proxy?: string;
    rateLimitStrategy?: 'wait' | 'error';
  }): Promise<HttpScraper>;
}
