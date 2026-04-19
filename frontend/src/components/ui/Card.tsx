import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({
  children,
  className = '',
  interactive = false,
  ...props
}: CardProps): JSX.Element {
  return (
    <div
      className={`surface-card ${interactive ? 'interactive' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
