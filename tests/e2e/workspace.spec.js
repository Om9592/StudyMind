import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('button', { name: 'Explore the demo workspace' }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test('all workspace routes render without runtime errors or horizontal overflow', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const route of ['/app', '/app/generate', '/app/notes', '/app/notes/demo-biology', '/app/revision', '/app/revision?note=demo-biology', '/app/practice', '/app/practice?note=demo-biology', '/app/assistant', '/app/saved', '/app/settings']) {
    await page.goto(route); await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBeTruthy();
  }
  expect(errors).toEqual([]);
});

test('URL form validates and explicitly refuses to fake live processing', async ({ page }) => {
  await page.goto('/app/generate');
  await page.getByLabel('YouTube video URL').fill('https://example.com/not-a-video');
  await page.getByRole('button', { name: 'Generate My Notes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('valid YouTube video URL');
  await page.getByLabel('YouTube video URL').fill('https://youtube.com/watch?v=jNQXAC9IVRw');
  await page.getByRole('button', { name: 'Generate My Notes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Live video analysis is not connected');
  await page.getByRole('button', { name: /Biology.*Photosynthesis/ }).click();
  await expect(page).toHaveURL(/notes\/demo-biology/);
  await expect(page.getByText('This is an authored sample', { exact: false })).toBeVisible();
});

test('search, bookmarks, folders, editing, persistence and delete', async ({ page }) => {
  await page.goto('/app/notes');
  await page.getByRole('searchbox', { name: 'Search your notes…' }).fill('Newton');
  await expect(page.locator('.note-card')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search your notes…' }).fill('no-such-topic-xyz');
  await expect(page.getByRole('heading', { name: 'No notes found. New keyword, maybe?' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'New folder' }).click();
  await page.getByLabel('Folder name').fill('Semester one');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(page.getByRole('button', { name: /Semester one/ })).toBeVisible();
  await page.goto('/app/notes/demo-biology');
  await page.getByLabel('Move note to folder').selectOption({ label: 'Semester one' });
  await page.getByRole('button', { name: 'Edit notes', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Photosynthesis — my edited notes');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Photosynthesis — my edited notes');
  await page.reload(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Photosynthesis — my edited notes');
  await page.getByRole('button', { name: 'Remove bookmark', exact: true }).click();
  await page.goto('/app/saved'); await expect(page.getByRole('heading', { name: 'Chemical Bonding & Molecular Structure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Photosynthesis — my edited notes' })).toHaveCount(0);
  await page.goto('/app/notes/demo-physics'); await page.getByRole('button', { name: 'Delete notes', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete notes', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/notes$/); await expect(page.locator('.note-card')).toHaveCount(2);
});

test('complete a quiz, see accuracy and retry incorrect answers', async ({ page }) => {
  await page.goto('/app/practice?note=demo-physics');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('radio').nth(i === 0 ? 0 : [2, 0, 1, 3][i]).click();
    await expect(page.locator('.answer-feedback')).toBeVisible();
    await page.getByRole('button', { name: i === 3 ? 'See my results' : 'Next question' }).click();
  }
  await expect(page.locator('.score-ring strong')).toHaveText('75%');
  await expect(page.getByText('3 of 4', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Retry 1 incorrect' }).click();
  await expect(page.getByText('Question 1 of 1')).toBeVisible();
  await page.getByRole('radio').nth(2).click(); await page.getByRole('button', { name: 'See my results' }).click();
  await expect(page.locator('.score-ring strong')).toHaveText('100%');
  await page.goto('/app/practice'); await expect(page.locator('.data-table tbody tr')).toHaveCount(2);
});

test('revision steps and flashcards persist', async ({ page }) => {
  await page.goto('/app/revision?note=demo-chemistry');
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.locator('.session-timer')).toContainText('09:59');
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await page.getByRole('button', { name: 'Mark complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'The facts that do the heavy lifting.' })).toBeVisible();
  await page.getByRole('button', { name: /Flashcard recall/ }).click();
  await page.getByRole('button', { name: 'Reveal flashcard answer' }).click();
  await expect(page.locator('.flashcard')).toContainText('Repulsion between electron domains');
  await page.getByRole('button', { name: 'I knew this' }).click();
  await expect(page.getByText('1 remembered')).toBeVisible();
  await page.reload(); await expect(page.locator('.session-progress strong')).toHaveText('20%');
});

test('assistant retrieval is grounded and labelled; conversations persist', async ({ page }) => {
  await page.goto('/app/assistant?note=demo-biology');
  await page.getByRole('button', { name: /The short version/ }).click();
  await expect(page.locator('.chat-message.assistant')).toContainText('DEMO RETRIEVAL');
  await expect(page.locator('.chat-message.assistant')).toContainText('Calvin cycle');
  await page.reload(); await expect(page.locator('.chat-message')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear conversation' }).click(); await expect(page.locator('.chat-welcome')).toBeVisible();
});

test('profile, theme and command search work', async ({ page }) => {
  await page.goto('/app/settings'); await page.getByLabel('Full name').fill('Priya Sharma');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.goto('/app'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Priya');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click(); await expect(page.locator('html')).toHaveClass('dark');
  await page.keyboard.press('Control+k'); await page.getByRole('searchbox', { name: 'Search notes, topics, or subjects…' }).fill('Newton');
  await page.locator('.command-item').filter({ hasText: 'Newton' }).click(); await expect(page).toHaveURL(/notes\/demo-physics/);
});

test('PDF export produces a real downloadable file', async ({ page }) => {
  await page.goto('/app/notes/demo-biology');
  const downloadPromise = page.waitForEvent('download', { timeout: 40000 });
  await page.getByRole('button', { name: 'Export PDF' }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
});

test('mobile navigation and layouts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/app', '/app/generate', '/app/notes', '/app/notes/demo-biology', '/app/revision?note=demo-biology', '/app/practice?note=demo-biology', '/app/assistant', '/app/settings']) {
    await page.goto(route); await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: 'Practice MCQs' }).click();
  await expect(page).toHaveURL(/\/app\/practice/); await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);
});

test('public navigation, sample tabs, FAQ and resource routes', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Perfect Study Notes.');
  await page.getByRole('tab', { name: 'Physics', exact: true }).click();
  await page.getByRole('button', { name: 'Practice MCQs', exact: true }).click();
  await expect(page.locator('.sample-window-content')).toContainText('2 kg object');
  await page.getByRole('button', { name: 'Can I get notes in Hindi or Hinglish?' }).click();
  await expect(page.locator('.faq-item.open')).toContainText('Devanagari');
  for (const route of ['/guides', '/guides/active-recall', '/youtube-to-notes', '/revision-notes', '/practice-mcqs', '/hinglish-study-notes', '/ai-study-assistant', '/help', '/contact', '/privacy', '/terms', '/settings-integration']) {
    const response = await page.goto(route); expect(response.status(), route).toBe(200); await expect(page.locator('h1').first()).toBeVisible();
  }
  await page.goto('/this-page-does-not-exist'); await expect(page.getByRole('heading', { level: 1 })).toContainText('blank note');
  expect(errors).toEqual([]);
});

test('protected routes redirect and demo logout clears access', async ({ page }) => {
  await page.getByRole('button', { name: 'Open account menu' }).click(); await page.getByRole('button', { name: 'Exit demo' }).click();
  await expect(page).toHaveURL(/\/$/); await page.goto('/app/notes'); await expect(page).toHaveURL(/\/login/);
});
