import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type = 'text', className = '', ...props }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const isPasswordType = type === 'password';
    const inputType = isPasswordType ? (isPasswordVisible ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col w-full gap-1.5 min-w-0">
        <label 
          className="text-xs font-bold tracking-widest font-heading uppercase text-brand-dark/70 ml-1 truncate block" 
          title={label}
        >
          {label}
        </label>
        
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={`w-full bg-white/40 border border-brand-light/60 text-brand-dark px-4 py-3 rounded-xl shadow-sm backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? 'border-red-500/50 focus:ring-red-500/30' : ''
            } ${className}`}
            {...props}
          />
          
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/50 hover:text-primary transition-colors focus:outline-none"
              tabIndex={-1}
            >
              {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
        </div>
        
        {/* Error message space (always reserved to prevent layout shift) */}
        <div className="min-h-5">
          {error && <span className="text-sm text-red-600 block px-1">{error}</span>}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
