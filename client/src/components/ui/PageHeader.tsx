import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Design system: Page header with title, optional breadcrumb, and action area

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleClick = (crumb: BreadcrumbItem) => {
    if (crumb.onClick) {
      crumb.onClick();
    } else if (crumb.href) {
      navigate(crumb.href);
    }
  };

  return (
    <div className={`mb-6 animate-content-fade-in ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 mb-2 text-sm text-gray-500"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
              {crumb.href || crumb.onClick ? (
                <button
                  onClick={() => handleClick(crumb)}
                  className="link-draw hover:text-primary-600 transition-all duration-150 cursor-pointer hover:scale-[1.02] bg-transparent border-none p-0 text-sm text-gray-500 font-normal"
                  type="button"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-700 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}