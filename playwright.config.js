import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, expect: { timeout: 8000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { args: ['--no-sandbox'] } },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:3000/api/health', reuseExistingServer: !process.env.CI, timeout: 30000 }
});
