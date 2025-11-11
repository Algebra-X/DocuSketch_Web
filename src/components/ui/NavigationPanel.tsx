'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, Home, Camera, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/supabase/supabaseClient';
import Button from '@/components/ui/CustomButton';

const PANEL_WIDTH = 256; // px

const NavigationPanel: FC = React.memo(() => {
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const toggle = useCallback(() => setIsOpen(v => !v), []);
  const closeOnEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  }, []);
  useEffect(() => {
    document.addEventListener('keydown', closeOnEsc);
    return () => document.removeEventListener('keydown', closeOnEsc);
  }, [closeOnEsc]);

  const logout = useCallback(async () => {
    // Try clearing demo cookie on the server (if present), then sign out Supabase if any,
    // finally navigate to the root.
    try {
      await fetch('/api/demo-logout', { method: 'POST', credentials: 'same-origin' })
        .catch(() => {
          /* ignore network errors */
        })
    } catch (e) {
      // ignore
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore errors signing out of Supabase if not used
    }

    router.push('/');
  }, [router, supabase]);

  const active = useMemo(
    () => ({
      isHome: pathname === '/main',
      isDemo: pathname.startsWith('/demo'),
    }),
    [pathname]
  );

  return (
    <div
      className="fixed inset-y-0 left-0 z-40 pointer-events-none"
      aria-label="Navigation panel"
      style={{ width: PANEL_WIDTH + 48 }}
    >
      <div
        className="h-full flex items-center transform-gpu will-change-transform transition-transform duration-200 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`,
        }}
      >
        <aside
          className="h-full flex flex-col pointer-events-auto nav-panel-bg"
          style={{ width: PANEL_WIDTH }}
        >
          <nav className="mt-16 flex-1 px-6 flex flex-col gap-4">
            <Link
              href="/main"
              className={`flex w-full items-center gap-3 nav-link ${active.isDemo ? 'nav-link--active' : ''}`}
            >
              <Camera size={20} />
              <span>Demo</span>
            </Link>
          </nav>

          <div className="px-6 pb-6 mt-auto">
            <Button
              text="Log out"
              size="md"
              hoverColor="pink"
              onClick={logout}
              Icon={LogOut}
              className="w-full nav-logout-btn"
            />
          </div>
        </aside>

        {/* Кнопка-тогглер (слева) */}
        <button
          onClick={toggle}
          aria-label={isOpen ? 'Close navigation panel' : 'Open navigation panel'}
          aria-expanded={isOpen}
          className="
            pointer-events-auto
            flex items-center justify-center
            w-12 h-12
            nav-panel-bg nav-panel-text
            rounded-r-full shadow-lg focus:outline-none
            transition-transform duration-200 ease-out transform-gpu
            hover:scale-110
          "
          style={{ willChange: 'transform' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* кликом по фону закрываем панель */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="pointer-events-auto fixed inset-0 z-[-1]"
        />
      )}
    </div>
  );
});

export default NavigationPanel;
