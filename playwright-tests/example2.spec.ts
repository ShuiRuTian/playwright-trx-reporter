import { test, expect } from '@playwright/test';

test('test case', async () => {
  expect(1).toBe(1)
});

test.skip('skipped test case', async () => {
  expect(1).toBe(1)
});
