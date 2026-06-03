export interface TweetMedia {
  type: string;
  url: string | null;
}

export interface Tweet {
  id: string | null;
  text: string;
  timestamp: string | null;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  isRetweet: boolean;
  isReply: boolean;
  author: string;
  media: TweetMedia[];
  url: string | null;
}

export interface Profile {
  name?: string | null;
  displayName?: string | null;
  username?: string | null;
  [key: string]: unknown;
}

export interface TwitterSession {
  authToken: string;
  ct0: string;
}

export interface CliOptions {
  target: string | null;
  limit: number;
  output: string;
  includeReplies: boolean;
  includeRetweets: boolean;
  headless: boolean;
  help: boolean;
}

export interface ScrapeProgress {
  scraped: number;
  limit: number;
}

export interface FilterOptions {
  includeReplies?: boolean;
  includeRetweets?: boolean;
}

export interface ScrapeUserTweetsOptions {
  username: string;
  limit?: number;
  session?: TwitterSession;
  headless?: boolean;
  includeReplies?: boolean;
  onProgress?: (payload: ScrapeProgress) => void;
}

export interface ExportMarkdownParams {
  profile: Profile | null;
  tweets: Tweet[];
  username: string;
  limit: number;
  outputRoot: string;
}

export interface ExportResult {
  outDir: string;
  mergedFile: string;
  indexFile: string;
  tweetCount: number;
}

export interface BrowserLaunchOptions {
  headless?: boolean;
  executablePath?: string;
  [key: string]: unknown;
}

export type RawTweet = Record<string, unknown>;
