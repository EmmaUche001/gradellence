import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon, label, path, isActive, collapsed, onClick }: SidebarItemProps) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 relative group',
        'border-l-4 border-transparent',
        collapsed ? 'justify-center' : '',
        isActive
          ? 'text-primary-700 border-l-primary-600 bg-primary-50 ml-0 pl-2'
          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900',
      ].join(' ')}
    >
      <span className={`shrink-0 ${isActive ? 'text-primary-600' : ''}`}>
        {icon}
      </span>
      {!collapsed && <span className="transition-opacity duration-200 opacity-100">{label}</span>}
      {/* Custom tooltip when collapsed */}
      {collapsed && (
        <span className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-semibold
          text-white bg-gray-900 rounded-lg whitespace-nowrap pointer-events-none
          opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
          transition-all duration-150 z-50 shadow-md">
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4
            border-transparent border-r-gray-900" />
        </span>
      )}
    </Link>
  );
}
