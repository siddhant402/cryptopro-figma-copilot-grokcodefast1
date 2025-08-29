import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService, AuthState, User } from '../../services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  active: boolean;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="main-navigation" [class.scrolled]="isScrolled">
      <div class="nav-container">
        <!-- Logo -->
        <div class="nav-logo">
          <a routerLink="/dashboard" class="logo-link">
            <span class="logo-icon">₿</span>
            <span class="logo-text">CryptoPro</span>
          </a>
        </div>

        <!-- Desktop Navigation -->
        <div class="nav-menu" [class.mobile-open]="mobileMenuOpen">
          <div class="nav-links">
            <a *ngFor="let item of navItems"
               [routerLink]="item.path"
               class="nav-link"
               [class.active]="item.active"
               (click)="closeMobileMenu()">
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </div>

          <!-- User Menu -->
          <div class="user-menu" *ngIf="user">
            <div class="user-info" (click)="toggleUserDropdown()">
              <div class="user-avatar">
                <span *ngIf="!user.avatar">{{ getInitials(user.firstName, user.lastName) }}</span>
                <img *ngIf="user.avatar" [src]="user.avatar" [alt]="user.username">
              </div>
              <div class="user-details">
                <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
                <span class="user-email">{{ user.email }}</span>
              </div>
              <span class="dropdown-arrow" [class.open]="userDropdownOpen">▼</span>
            </div>

            <!-- User Dropdown -->
            <div class="user-dropdown" [class.open]="userDropdownOpen">
              <a routerLink="/settings" class="dropdown-item" (click)="closeUserDropdown()">
                <span class="dropdown-icon">⚙️</span>
                Settings
              </a>
              <a routerLink="/wallet" class="dropdown-item" (click)="closeUserDropdown()">
                <span class="dropdown-icon">👛</span>
                Wallet
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout-btn" (click)="logout()">
                <span class="dropdown-icon">🚪</span>
                Logout
              </button>
            </div>
          </div>

          <!-- Auth Buttons (when not logged in) -->
          <div class="auth-buttons" *ngIf="!user">
            <a routerLink="/login" class="btn-secondary">Login</a>
            <a routerLink="/register" class="btn-primary">Sign Up</a>
          </div>
        </div>

        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-toggle" (click)="toggleMobileMenu()" [class.open]="mobileMenuOpen">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>

      <!-- Mobile Menu Overlay -->
      <div class="mobile-overlay" *ngIf="mobileMenuOpen" (click)="closeMobileMenu()"></div>
    </nav>
  `,
  styles: [`
    .main-navigation {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .main-navigation.scrolled {
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .nav-logo {
      flex-shrink: 0;
    }

    .logo-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1.5rem;
      transition: color 0.2s;
    }

    .logo-link:hover {
      color: var(--primary-color);
    }

    .logo-icon {
      font-size: 2rem;
      color: var(--primary-color);
    }

    .logo-text {
      background: linear-gradient(135deg, var(--primary-color), #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-menu {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: var(--text-secondary);
      border-radius: 0.5rem;
      transition: all 0.2s;
      font-weight: 500;
      position: relative;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    .nav-link.active {
      color: var(--primary-color);
      background: rgba(59, 130, 246, 0.1);
    }

    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background: var(--primary-color);
      border-radius: 1px;
    }

    .nav-icon {
      font-size: 1.1rem;
    }

    .nav-label {
      font-size: 0.9rem;
    }

    .user-menu {
      position: relative;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .user-info:hover {
      background: var(--bg-hover);
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      overflow: hidden;
    }

    .user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-name {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .user-email {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .dropdown-arrow {
      font-size: 0.8rem;
      color: var(--text-secondary);
      transition: transform 0.2s;
    }

    .dropdown-arrow.open {
      transform: rotate(180deg);
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      min-width: 200px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: all 0.2s;
      z-index: 1000;
    }

    .user-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      text-decoration: none;
      color: var(--text-secondary);
      transition: all 0.2s;
      border-radius: 0.5rem;
      margin: 0.25rem;
    }

    .dropdown-item:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    .dropdown-icon {
      font-size: 1rem;
      width: 20px;
      text-align: center;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-color);
      margin: 0.5rem 0;
    }

    .logout-btn {
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      color: #ef4444;
    }

    .logout-btn:hover {
      color: #dc2626;
      background: rgba(239, 68, 68, 0.1);
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .auth-buttons .btn-secondary {
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .auth-buttons .btn-secondary:hover {
      color: var(--text-primary);
      border-color: var(--primary-color);
    }

    .auth-buttons .btn-primary {
      padding: 0.5rem 1rem;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .auth-buttons .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .mobile-menu-toggle {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 0.25rem;
      transition: background 0.2s;
    }

    .mobile-menu-toggle:hover {
      background: var(--bg-hover);
    }

    .hamburger-line {
      width: 20px;
      height: 2px;
      background: var(--text-secondary);
      transition: all 0.3s;
      transform-origin: center;
    }

    .mobile-menu-toggle.open .hamburger-line:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }

    .mobile-menu-toggle.open .hamburger-line:nth-child(2) {
      opacity: 0;
    }

    .mobile-menu-toggle.open .hamburger-line:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -6px);
    }

    .mobile-overlay {
      position: fixed;
      top: 70px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
      .nav-container {
        padding: 0 1rem;
      }

      .nav-menu {
        position: fixed;
        top: 70px;
        left: 0;
        right: 0;
        background: var(--bg-primary);
        border-top: 1px solid var(--border-color);
        flex-direction: column;
        align-items: stretch;
        padding: 1rem;
        transform: translateY(-100%);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s;
        z-index: 1000;
      }

      .nav-menu.mobile-open {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
      }

      .nav-links {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        margin-bottom: 1rem;
      }

      .nav-link {
        justify-content: flex-start;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.25rem;
      }

      .user-menu {
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }

      .user-info {
        padding: 1rem;
        margin: -0.5rem -1rem 0.5rem -1rem;
      }

      .user-dropdown {
        position: static;
        box-shadow: none;
        border: none;
        background: transparent;
        opacity: 1;
        visibility: visible;
        transform: none;
        margin-top: 0.5rem;
      }

      .user-dropdown .dropdown-item {
        margin: 0;
        border-radius: 0.5rem;
      }

      .auth-buttons {
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid var(--border-color);
        padding-top: 1rem;
      }

      .auth-buttons .btn-secondary,
      .auth-buttons .btn-primary {
        text-align: center;
        padding: 0.75rem 1rem;
      }

      .mobile-menu-toggle {
        display: flex;
      }

      .nav-links {
        display: none;
      }

      .nav-menu.mobile-open .nav-links {
        display: flex;
      }
    }

    /* Hide elements on mobile when menu is closed */
    @media (max-width: 768px) {
      .nav-menu:not(.mobile-open) .nav-links,
      .nav-menu:not(.mobile-open) .user-menu,
      .nav-menu:not(.mobile-open) .auth-buttons {
        display: none;
      }
    }
  `]
})
export class NavigationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  user: User | null = null;
  isScrolled = false;
  mobileMenuOpen = false;
  userDropdownOpen = false;

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      active: false
    },
    {
      label: 'Trade',
      path: '/trade',
      icon: '📈',
      active: false
    },
    {
      label: 'Wallet',
      path: '/wallet',
      icon: '👛',
      active: false
    },
    {
      label: 'Market',
      path: '/market',
      icon: '🌍',
      active: false
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  ngOnInit() {
    this.setupAuthListener();
    this.setupRouteListener();
    this.setupScrollListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAuthListener() {
    this.authService.getAuthState().pipe(takeUntil(this.destroy$)).subscribe((state: AuthState) => {
      this.user = state.user;
    });
  }

  private setupRouteListener() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateActiveNavItem(event.url);
        this.closeMobileMenu();
        this.closeUserDropdown();
      });
  }

  private setupScrollListener() {
    // Guard window access for SSR builds. Use document.defaultView when available.
    const win = typeof window !== 'undefined' ? window : (this.doc && (this.doc.defaultView as Window) || null);
    if (!win) return;

    const handleScroll = () => {
      this.isScrolled = (win as Window).scrollY > 10;
    };

    win.addEventListener('scroll', handleScroll, { passive: true });

    this.destroy$.subscribe(() => {
      win.removeEventListener('scroll', handleScroll);
    });
  }

  private updateActiveNavItem(currentUrl: string) {
    this.navItems.forEach(item => {
      item.active = currentUrl.startsWith(item.path);
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.closeUserDropdown();
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  toggleUserDropdown() {
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  closeUserDropdown() {
    this.userDropdownOpen = false;
  }

  async logout() {
    await this.authService.logout();
    this.closeUserDropdown();
    this.closeMobileMenu();
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
}
