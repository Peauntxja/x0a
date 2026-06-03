import fs from 'node:fs';

const SYSTEM_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

/**
 * 优先使用环境变量或本机已安装的 Chrome，避免 Puppeteer 缓存缺失时报错。
 * @param {{ headless?: boolean }} options
 * @returns {{ headless?: boolean, executablePath?: string }}
 */
export function resolveBrowserOptions(options = {}) {
  const resolved = { ...options };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const customPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (fs.existsSync(customPath)) {
      resolved.executablePath = customPath;
      return resolved;
    }
    console.warn(`⚠️  PUPPETEER_EXECUTABLE_PATH 不存在: ${customPath}`);
  }

  for (const candidate of SYSTEM_CHROME_PATHS) {
    if (fs.existsSync(candidate)) {
      resolved.executablePath = candidate;
      return resolved;
    }
  }

  return resolved;
}
