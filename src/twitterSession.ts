import type { Page } from 'puppeteer';
import type { TwitterSession } from './types.js';

export function loadTwitterSessionFromEnv(): TwitterSession {
  return {
    authToken: (process.env.XACTIONS_AUTH_TOKEN || '').trim(),
    ct0: (process.env.XACTIONS_CT0 || '').trim(),
  };
}

export function validateTwitterSession(session: TwitterSession): string[] {
  const issues: string[] = [];

  if (!session.authToken) {
    issues.push('未设置 XACTIONS_AUTH_TOKEN');
  } else if (session.authToken.startsWith('eyJ')) {
    issues.push(
      'XACTIONS_AUTH_TOKEN 格式不对：你填的像 JWT。请在 x.com → F12 → Application → Cookies 中复制 auth_token（通常为 40 位十六进制字符串）'
    );
  }

  if (!session.ct0) {
    issues.push(
      '未设置 XACTIONS_CT0：请在 x.com Cookies 中同时复制 ct0（CSRF token，抓取必需）'
    );
  }

  return issues;
}

export function buildCookieHeader(session: TwitterSession): string {
  return `auth_token=${session.authToken}; ct0=${session.ct0}`;
}

export async function loginPageWithSession(
  page: Page,
  session: TwitterSession
): Promise<void> {
  await page.setCookie(
    {
      name: 'auth_token',
      value: session.authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    },
    {
      name: 'ct0',
      value: session.ct0,
      domain: '.x.com',
      path: '/',
      secure: true,
    }
  );

  await page.goto('https://x.com/home', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
}
