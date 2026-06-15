import { describe, it, expect } from 'vitest';
import { tokenStorage } from '@/infrastructure/storage/tokenStorage';

// localStorage is reset before every test by src/test/setup.ts.
describe('tokenStorage', () => {
  it('given a token, when set, then get returns it', () => {
    // Arrange + Act
    tokenStorage.setToken('abc.def.ghi');

    // Assert
    expect(tokenStorage.getToken()).toBe('abc.def.ghi');
  });

  it('given no token stored, when get, then returns null', () => {
    expect(tokenStorage.getToken()).toBeNull();
  });

  it('given a stored token, when removeToken, then get returns null', () => {
    // Arrange
    tokenStorage.setToken('abc.def.ghi');

    // Act
    tokenStorage.removeToken();

    // Assert
    expect(tokenStorage.getToken()).toBeNull();
  });

  it('given setToken, when called, then writes under the access_token key', () => {
    // Act
    tokenStorage.setToken('xyz');

    // Assert
    expect(localStorage.getItem('access_token')).toBe('xyz');
  });
});
