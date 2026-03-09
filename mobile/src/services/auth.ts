import { api, tokenManager, LoginRequest, RegisterRequest, AuthResponse, User } from './api';

// ── Auth Service ──────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Authenticate user with email and password.
   * Stores tokens and user data in AsyncStorage.
   */
  login: async (
    email: string,
    password: string
  ): Promise<{ user: User }> => {
    try {
      const response = await api.login({ email, password });
      const { accessToken, refreshToken, user } = response.data;

      await tokenManager.setToken(accessToken);
      await tokenManager.setRefreshToken(refreshToken);
      await tokenManager.setUser(user);

      return { user };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Login failed. Please check your credentials.';
      throw new Error(message);
    }
  },

  /**
   * Register a new patient account.
   * Automatically logs in after successful registration.
   */
  register: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ user: User }> => {
    try {
      const registerData: RegisterRequest = {
        ...data,
        role: 'patient',
      };

      const response = await api.register(registerData);
      const { accessToken, refreshToken, user } = response.data;

      await tokenManager.setToken(accessToken);
      await tokenManager.setRefreshToken(refreshToken);
      await tokenManager.setUser(user);

      return { user };
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    }
  },

  /**
   * Log the user out and clear all stored tokens.
   */
  logout: async (): Promise<void> => {
    try {
      await tokenManager.clearTokens();
    } catch (error) {
      console.error('Logout error:', error);
      // Clear tokens regardless of errors
      await tokenManager.clearTokens();
    }
  },

  /**
   * Get the current JWT access token.
   */
  getToken: async (): Promise<string | null> => {
    return tokenManager.getToken();
  },

  /**
   * Get the currently stored user data.
   */
  getUser: async (): Promise<User | null> => {
    return tokenManager.getUser();
  },

  /**
   * Check whether the user is currently authenticated.
   */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await tokenManager.getToken();
    return !!token;
  },

  /**
   * Update the locally stored user profile.
   */
  updateStoredUser: async (user: User): Promise<void> => {
    await tokenManager.setUser(user);
  },
};
