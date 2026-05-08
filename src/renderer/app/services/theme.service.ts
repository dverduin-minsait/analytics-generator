import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'high-contrast';

const STORAGE_KEY = 'analytics-platform-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly currentTheme = signal<Theme>(this.resolveInitialTheme());

  constructor() {
    // Sync the data-theme attribute on the document root whenever the signal changes
    effect(() => {
      const theme = this.currentTheme();
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.setAttribute('data-theme', theme);
        try {
          localStorage.setItem(STORAGE_KEY, theme);
        } catch {
          // localStorage may be unavailable in some sandboxed contexts
        }
      }
    });
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  toggleDarkMode(): void {
    this.currentTheme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  cycleTheme(): void {
    const order: Theme[] = ['light', 'dark', 'high-contrast'];
    const current = this.currentTheme();
    const idx = order.indexOf(current);
    this.currentTheme.set(order[(idx + 1) % order.length]);
  }

  private resolveInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'dark';

    // 1. User preference persisted in localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ['light', 'dark', 'high-contrast'].includes(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }

    // 2. OS preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }
}
