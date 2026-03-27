import { cn } from '@/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  title,
  description,
  action,
  hover = true,
  padding = 'md',
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white shadow-sm',
        hover && 'hover:shadow-xl hover:border-zinc-300 transition-all duration-300',
        className
      )}
    >
      {(title || description || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-zinc-500 mt-1">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('px-6 py-4 border-b border-zinc-100', className)}>{children}</div>;
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-4 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl', className)}>
      {children}
    </div>
  );
}
