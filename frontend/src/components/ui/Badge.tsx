import React from 'react';

export type BadgeVariant =
  | 'live'
  | 'warn'
  | 'danger'
  | 'open'
  | 'closed'
  | 'info'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  label?: string;
  icon?: React.ReactNode;
}

const VARIANT_CLASS_MAP: Record<BadgeVariant, string> = {
  live: 'badge-live',
  warn: 'badge-warn',
  danger: 'badge-danger',
  open: 'badge-open',
  closed: 'badge-closed',
  info: 'badge-info',
  low: 'badge-open',
  medium: 'badge-warn',
  high: 'badge-warn',
  critical: 'badge-danger',
};

export function Badge({
  variant,
  label,
  icon,
  className = '',
  children,
  ...props
}: BadgeProps): JSX.Element {
  return (
    <span className={`badge ${VARIANT_CLASS_MAP[variant]} ${className}`} {...props}>
      {icon}
      {children ?? label}
    </span>
  );
}
