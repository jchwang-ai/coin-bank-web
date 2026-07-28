'use client';

export interface TabBarItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
}

interface TabBarProps {
  items: TabBarItem[];
  activeId: string;
  onChange: (id: string) => void;
  accentColor?: string;
}

export default function TabBar({ items, activeId, onChange, accentColor = '#e11d8f' }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-black/5 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 transition-transform active:scale-95"
            >
              <span className="relative inline-block">
                <span className="text-[22px] leading-none" style={{ filter: isActive ? 'none' : 'grayscale(0.6) opacity(0.6)' }}>
                  {isActive && item.activeIcon ? item.activeIcon : item.icon}
                </span>
                {!!item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? accentColor : '#8e8e93' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
