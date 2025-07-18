import React from 'react';

interface AdaptiveIbdIconProps {
  color: string;
  className?: string;
  size?: number;
}

export const AdaptiveIbdIcon: React.FC<AdaptiveIbdIconProps> = ({ 
  color, 
  className,
  size = 16 
}) => {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background shape that takes the dynamic color */}
      <rect 
        width="24" 
        height="24" 
        rx="4" 
        fill={color}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="0.5"
      />
      
      {/* Document icon with white lines inside */}
      <path 
        d="M7 8H17" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M7 12H15" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M7 16H12" 
        stroke="white" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      
      {/* Small corner fold to make it look like a document */}
      <path 
        d="M15 6L17 8H15V6Z" 
        fill="rgba(255,255,255,0.3)"
      />
    </svg>
  );
};