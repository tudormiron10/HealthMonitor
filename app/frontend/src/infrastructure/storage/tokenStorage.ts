// Abstraction over browser localStorage for token management.
// Centralizes storage access so the rest of the app never calls
// localStorage directly for auth tokens.

const TOKEN_KEY = 'access_token';

export const tokenStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },
};
