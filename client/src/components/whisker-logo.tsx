interface WhiskerLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function WhiskerLogo({ size = 'md', showText = true, className = '' }: WhiskerLogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
    xl: { icon: 48, text: 'text-3xl' }
  };
  
  const { icon, text } = sizes[size];
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Whisker Icon - Cat face with whiskers representing connections/swaps */}
      <div className="relative">
        <svg 
          width={icon} 
          height={icon} 
          viewBox="0 0 48 48" 
          className="text-blue-600 dark:text-blue-400"
          fill="currentColor"
        >
          {/* Main cat face circle */}
          <circle cx="24" cy="24" r="20" className="fill-current opacity-90" />
          
          {/* Cat ears */}
          <path d="M10 16 L18 8 L20 18 Z" className="fill-current" />
          <path d="M38 16 L30 8 L28 18 Z" className="fill-current" />
          
          {/* Inner ear */}
          <path d="M12 15 L16 10 L17 16 Z" className="fill-white dark:fill-gray-900 opacity-60" />
          <path d="M36 15 L32 10 L31 16 Z" className="fill-white dark:fill-gray-900 opacity-60" />
          
          {/* Eyes */}
          <circle cx="18" cy="20" r="3" className="fill-white dark:fill-gray-900" />
          <circle cx="30" cy="20" r="3" className="fill-white dark:fill-gray-900" />
          <circle cx="18" cy="20" r="1.5" className="fill-blue-800 dark:fill-blue-300" />
          <circle cx="30" cy="20" r="1.5" className="fill-blue-800 dark:fill-blue-300" />
          
          {/* Nose */}
          <path d="M24 26 L21 30 L27 30 Z" className="fill-pink-500 dark:fill-pink-400" />
          
          {/* Whiskers - representing swap connections */}
          <line x1="8" y1="22" x2="15" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="26" x2="15" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="30" x2="15" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          
          <line x1="40" y1="22" x2="33" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="26" x2="33" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="30" x2="33" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          
          {/* Subtle swap arrows in whiskers */}
          <path d="M12 24 L10 22 L10 26 Z" className="fill-current opacity-40" />
          <path d="M36 24 L38 22 L38 26 Z" className="fill-current opacity-40" />
        </svg>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md -z-10"></div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold ${text} text-gray-900 dark:text-white leading-none`}>
            WhiskerSwap
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-none">
            HyperEVM DEX
          </p>
        </div>
      )}
    </div>
  );
}