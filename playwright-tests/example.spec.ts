import { test } from '@playwright/test';

class TrxHelper {
  static pushAnnotation(type: string, value: string) {
    test.info().annotations.push({
      type: type,
      description: value,
    });
  }

  static owner(owner: string) {
    this.pushAnnotation('owner', owner);
  }

  static priority(priority: number) {
    this.pushAnnotation('priority', priority.toString());
  }
}

test('trx-owner', async ({ page }) => {
  TrxHelper.owner('Song Gao');
});

test('trx-priority', async ({ page }) => {
  TrxHelper.priority(1);
});

test('trx-exception', async ({ page }) => {
  test.fail();
  throw new Error("Error message from 'trx-exception'");
});

test('trx-retry-when-failed', async ({ page }, testInfo) => {
  if (testInfo.retry === 0)
    throw new Error();
});

test('trx-stdout', async ({ page }) => {
  console.log('output to std out stream');
});

test('trx-stderr', async ({ page }) => {
  console.error('output to std err stream');
});

test('trx-attachment-text', async ({ page }, testInfo) => {
  testInfo.attach('text-attachment', {
    path: './resources/hello.txt',
  });
});

test('trx-attachment-png', async ({ page }, testInfo) => {
  testInfo.attach('text-attachment', {
    path: './resources/crab.png',
  });
});

test('trx-out-of-time', async ({ page }, testInfo) => {
  test.setTimeout(1);
  console.log('[out-of-time]: log');
  console.error('[out-of-time]: error');
  for (let index = 0; index < 10000000; index++) {
  }
});

const testWithAoto = test.extend<{ trx_auto_1: void }>({
  trx_auto_1: [async ({ }, use, testInfo) => {
    TrxHelper.owner('Someone');
    TrxHelper.priority(5);
    await use();
  }, { auto: true }],
});

testWithAoto('auto', async () => {
  // Not need to do anything
  // If you want to change the owner, just 
  // trx.owner('someone else')
});