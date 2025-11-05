// src/components/ui/NavigationPanel.tsx
'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Menu,
  Home,
  Camera,
  FlaskConical,
  Package,
  ChevronRight,
  Pencil,
  Users,
  Tag,
  User2,
  MessageCircle,
  RotateCw,
  LogOut,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from "@/supabase/supabaseClient"; 
import Button from '@/components/ui/CustomButton';

const PANEL_BG = '#262039';
const TEXT_ACTIVE = '#FFFFFF';
const TEXT_INACTIVE = '#CBC3E0';
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
    await supabase.auth.signOut();
    router.push('/');
  }, [router]);

  const active = useMemo(
    () => ({
      isHome: pathname === '/main',
      isProducts: pathname.startsWith('/products'),
    }),
    [pathname]
  );

  // общий wrapper двигаем transform-ом; pointer-events на wrapper off,
  // чтобы не перекрывать страницу, но на внутренних элементах — on
  return (
    <div
      className="fixed inset-y-0 left-0 z-40 pointer-events-none"
      aria-label="Navigation panel"
      style={{ width: PANEL_WIDTH + 48 }} // ширина панели + кнопка
    >
      {/* Двигаем и панель, и кнопку одной трансформацией */}
      <div
        className={`h-full flex items-center transform-gpu will-change-transform transition-transform duration-200 ease-out`}
        style={{
          transform: isOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`,
        }}
      >
        {/* сама панель */}
        <aside
          className="h-full flex flex-col pointer-events-auto"
          style={{ backgroundColor: PANEL_BG, width: PANEL_WIDTH }}
        >
          <nav className="mt-16 flex-1 px-6 space-y-4">
            <Link
              href="/main"
              className={`flex items-center space-x-3 ${
                active.isHome ? 'text-white' : 'opacity-60 hover:opacity-100 text-[#CBC3E0]'
              }`}
            >
              <Home size={20} color={active.isHome ? TEXT_ACTIVE : TEXT_INACTIVE} />
              <span>Home</span>
            </Link>

            <Link href="/todos" className="flex items-center space-x-3 opacity-60 hover:opacity-100 text-[#CBC3E0]">
              <Pencil size={20} color={TEXT_INACTIVE} />
              <span>Todos</span>
            </Link>
          </nav>

          <div className="px-6 pb-6 mt-auto">
            <Button
              text="Abmelden"
              size="md"
              hoverColor="red"
              onClick={logout}
              Icon={LogOut}
              className="w-full bg-[#7C3AED] text-white"
            />
          </div>
        </aside>

        {/* Кнопка-тогглер. Pointer events включены. */}
        <button
          onClick={toggle}
          aria-label={isOpen ? 'Close navigation panel' : 'Open navigation panel'}
          aria-expanded={isOpen}
          className="
            pointer-events-auto
            flex items-center justify-center
            w-12 h-12
            bg-[#262039] rounded-r-full text-white
            shadow-lg focus:outline-none
            transition-transform duration-200 ease-out transform-gpu
            hover:scale-110
          "
          style={{ willChange: 'transform' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* затемнение экрана по желанию — без блокировки кадров */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="pointer-events-auto fixed inset-0 z-[-1]" // под панелью и кнопкой
        />
      )}
    </div>
  );
});

export default NavigationPanel;
