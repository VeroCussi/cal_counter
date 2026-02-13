'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  const hoverClass = hover ? 'hover:shadow-md' : '';
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow transition-smooth ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
