// src/components/ui/NavigationWrapper.tsx
'use client';

import { usePathname } from 'next/navigation';
import NavigationPanel from './NavigationPanel';

export default function NavigationWrapper() {
  const pathname = usePathname();
  if (pathname === '/' || pathname === '/login') return null;
  return <NavigationPanel />;
}
