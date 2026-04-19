import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary' | 'emergency';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[38px] px-3.5 text-sm',
  md: 'min-h-[42px] px-4 text-sm',
  lg: 'min-h-[48px] px-5 text-base',
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'btn-primary shadow-[0_14px_32px_rgba(37,99,235,0.18)]',
  ghost: 'btn-ghost',
  outline: 'btn-ghost',
  secondary: 'btn-ghost',
  danger: 'btn-danger',
  emergency: 'btn-danger',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingLabel = 'Working...',
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`focus-ring inline-flex items-center justify-center gap-2 font-semibold ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {!isLoading ? leftIcon : null}
        <span>{isLoading ? loadingLabel : children}</span>
        {!isLoading ? rightIcon : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
