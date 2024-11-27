'use client';

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const tabs = [
  { name: 'Droplets', value: 'droplets' },
  { name: 'Playlists', value: 'playlists' },
];

export function ContentSelector() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const currentTab = searchParams.get('tab') || 'droplets';

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(name, value);
    return params.toString();
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              router.push(`${pathname}?${createQueryString('tab', tab.value)}`);
            }}
            className={cn(
              tab.value === currentTab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
            )}
          >
            {tab.name}
          </button>
        ))}
      </nav>
    </div>
  );
} 