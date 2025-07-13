interface TokenLogoProps {
  symbol: string;
  logo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TokenLogo({ symbol, logo, size = 'md', className = '' }: TokenLogoProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base'
  };

  if (logo && logo !== '') {
    return (
      <img
        src={logo}
        alt={symbol}
        className={`${sizeClasses[size]} rounded-full ${className}`}
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.nextSibling) {
            (target.nextSibling as HTMLElement).style.display = 'flex';
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center font-bold text-white ${className}`}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}