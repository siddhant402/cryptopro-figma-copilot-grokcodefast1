import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  currency: string;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    tradeAlerts: boolean;
    priceAlerts: boolean;
  };
  privacy: {
    showBalance: boolean;
    showPortfolio: boolean;
    allowAnalytics: boolean;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'cryptopro_auth';
  private readonly USER_STORAGE_KEY = 'cryptopro_user';

  private authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeAuthState();
  }

  private initializeAuthState() {
    // Only access localStorage if we're in a browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedAuth = localStorage.getItem(this.STORAGE_KEY);
    const storedUser = localStorage.getItem(this.USER_STORAGE_KEY);

    if (storedAuth && storedUser) {
      try {
        const authData = JSON.parse(storedAuth);
        const userData = JSON.parse(storedUser);

        // Check if token is still valid (simple expiration check)
        if (authData.expiresAt && new Date(authData.expiresAt) > new Date()) {
          this.authState.next({
            isAuthenticated: true,
            user: userData,
            isLoading: false,
            error: null
          });
        } else {
          // Token expired, clear storage
          this.clearStoredAuth();
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
        this.clearStoredAuth();
      }
    }
  }

  private clearStoredAuth() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USER_STORAGE_KEY);
  }

  private storeAuthData(token: string, user: User) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const authData = {
      token,
      expiresAt: expiresAt.toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
    localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
  }

  // Public methods
  getAuthState(): Observable<AuthState> {
    return this.authState.asObservable();
  }

  getCurrentUser(): User | null {
    return this.authState.value.user;
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  async login(credentials: LoginCredentials): Promise<boolean> {
    this.setLoading(true);
    this.clearError();

    try {
      // Simulate API call delay
      await this.delay(1500);

      // Mock authentication - in real app, this would be an HTTP request
      const mockUser = this.getMockUser(credentials.email);

      if (!mockUser) {
        throw new Error('Invalid email or password');
      }

      // Simulate password verification
      const isValidPassword = await this.verifyPassword(credentials.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update user last login
      mockUser.lastLoginAt = new Date();

      // Store auth data
      const token = this.generateToken();
      this.storeAuthData(token, mockUser);

      // Update auth state
      this.authState.next({
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      this.setError(errorMessage);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async register(registerData: RegisterData): Promise<boolean> {
    this.setLoading(true);
    this.clearError();

    try {
      // Validate registration data
      if (registerData.password !== registerData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (registerData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!registerData.acceptTerms) {
        throw new Error('You must accept the terms and conditions');
      }

      // Simulate API call delay
      await this.delay(2000);

      // Check if user already exists
      if (this.userExists(registerData.email)) {
        throw new Error('User with this email already exists');
      }

      // Create new user
      const newUser: User = {
        id: this.generateUserId(),
        email: registerData.email,
        username: registerData.username,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        isEmailVerified: false,
        createdAt: new Date(),
        preferences: this.getDefaultPreferences()
      };

      // Store auth data
      const token = this.generateToken();
      this.storeAuthData(token, newUser);

      // Update auth state
      this.authState.next({
        isAuthenticated: true,
        user: newUser,
        isLoading: false,
        error: null
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.setError(errorMessage);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async logout(): Promise<void> {
    this.setLoading(true);

    try {
      // Simulate API call delay
      await this.delay(500);

      // Clear stored auth data
      this.clearStoredAuth();

      // Update auth state
      this.authState.next({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });

      // Navigate to home page
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setLoading(false);
    }
  }

  async updateProfile(updates: Partial<User>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      this.setError('User not authenticated');
      return false;
    }

    this.setLoading(true);
    this.clearError();

    try {
      // Simulate API call delay
      await this.delay(1000);

      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not found');
      }

      const updatedUser = { ...currentUser, ...updates };

      // Update stored user data
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }

      // Update auth state
      this.authState.next({
        ...this.authState.value,
        user: updatedUser
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      this.setError(errorMessage);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      this.setError('User not authenticated');
      return false;
    }

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    const updatedPreferences = { ...currentUser.preferences, ...preferences };
    return this.updateProfile({ preferences: updatedPreferences });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      this.setError('User not authenticated');
      return false;
    }

    this.setLoading(true);
    this.clearError();

    try {
      // Simulate API call delay
      await this.delay(1000);

      // Verify current password
      const isValidCurrentPassword = await this.verifyPassword(currentPassword);
      if (!isValidCurrentPassword) {
        throw new Error('Current password is incorrect');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // In a real app, this would update the password on the server
      // For demo purposes, we'll just simulate success
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      this.setError(errorMessage);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    this.setLoading(true);
    this.clearError();

    try {
      // Simulate API call delay
      await this.delay(1000);

      // In a real app, this would send a reset email
      // For demo purposes, we'll just simulate success
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      this.setError(errorMessage);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  // Helper methods
  private setLoading(loading: boolean) {
    this.authState.next({
      ...this.authState.value,
      isLoading: loading
    });
  }

  private setError(error: string) {
    this.authState.next({
      ...this.authState.value,
      error
    });
  }

  private clearError() {
    this.authState.next({
      ...this.authState.value,
      error: null
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateToken(): string {
    return 'mock_jwt_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getMockUser(email: string): User | null {
    // Mock user database - in real app, this would be an API call
    const mockUsers: User[] = [
      {
        id: 'user_123',
        email: 'demo@cryptopro.com',
        username: 'demotrader',
        firstName: 'Demo',
        lastName: 'Trader',
        isEmailVerified: true,
        createdAt: new Date('2024-01-15'),
        lastLoginAt: new Date(),
        preferences: this.getDefaultPreferences()
      }
    ];

    return mockUsers.find(user => user.email === email) || null;
  }

  private userExists(email: string): boolean {
    // In real app, this would check against the server
    return email === 'demo@cryptopro.com';
  }

  private async verifyPassword(password: string): Promise<boolean> {
    // Mock password verification - in real app, this would verify against server
    await this.delay(500); // Simulate verification delay
    return password === 'demo123' || password.length >= 6; // Simple mock validation
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      currency: 'USD',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false,
        tradeAlerts: true,
        priceAlerts: true
      },
      privacy: {
        showBalance: true,
        showPortfolio: true,
        allowAnalytics: true
      }
    };
  }
}
