import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavigationComponent],
  template: `
    <app-navigation></app-navigation>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .main-content {
      margin-top: 70px; /* Account for fixed navigation */
      min-height: calc(100vh - 70px);
    }

    /* Global styles for the app */
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    /* CSS Custom Properties for theming */
    :host {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-hover: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border-color: #e2e8f0;
      --primary-color: #3b82f6;
      --primary-hover: #2563eb;
      --success-color: #10b981;
      --error-color: #ef4444;
      --warning-color: #f59e0b;
    }

    /* Dark theme support */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-hover: #334155;
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-muted: #64748b;
        --border-color: #334155;
        --primary-color: #3b82f6;
        --primary-hover: #2563eb;
      }
    }

    /* Responsive typography */
    @media (max-width: 768px) {
      :host {
        font-size: 14px;
      }
    }

    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--bg-secondary);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }

    /* Focus styles for accessibility */
    *:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    /* Button reset */
    button {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }

    /* Link reset */
    a {
      color: inherit;
      text-decoration: none;
    }

    /* Form elements */
    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
    }

    /* Animation utilities */
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class App {
  protected readonly title = signal('CryptoPro - Advanced Cryptocurrency Trading Platform');
}
