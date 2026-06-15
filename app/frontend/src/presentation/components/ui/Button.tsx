import React from 'react';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-heading tracking-widest uppercase transition-all duration-300 rounded-sm select-none whitespace-nowrap';
  
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-brand-light hover:bg-primary-hover shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-brand-light',
    ghost: 'bg-transparent text-primary hover:bg-primary/10',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2 text-lg lg:text-xl',
    lg: 'px-10 py-4 text-2xl lg:text-3xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
