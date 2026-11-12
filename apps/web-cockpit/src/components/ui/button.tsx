import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variantStyles = {
      default:
        'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 border-transparent',
      outline:
        'border-slate-300 dark:border-cyan-500/40 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-cyan-400 dark:hover:bg-cyan-950/40 dark:hover:text-white shadow-xs',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white dark:border-slate-700 shadow-xs',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 border-transparent',
      destructive:
        'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/80 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-900 dark:hover:text-white shadow-xs',
      link:
        'text-cyan-600 dark:text-cyan-400 underline-offset-4 hover:underline bg-transparent border-transparent p-0',
    };

    const sizeStyles = {
      default: 'h-9 px-4 py-2 text-xs font-semibold',
      sm: 'h-7 px-3 text-[11px] font-medium rounded-lg',
      lg: 'h-11 px-6 text-sm font-bold rounded-xl',
      icon: 'h-9 w-9 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-xl font-mono uppercase tracking-wider transition-all duration-150 outline-none select-none border focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95',
          variantStyles[variant] || variantStyles.default,
          sizeStyles[size] || sizeStyles.default,
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
