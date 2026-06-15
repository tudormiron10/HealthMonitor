import { beforeEach } from 'vitest';

// Shared test setup: start every test with a clean localStorage so token
// storage tests never leak state into one another.
beforeEach(() => {
  localStorage.clear();
});
