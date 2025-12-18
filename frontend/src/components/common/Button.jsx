const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-sm active:scale-[0.99]';

  const variants = {
    primary:
      'bg-black text-white shadow-lg shadow-black/30 hover:bg-neutral-900 focus-visible:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed',
    secondary:
      'bg-white/90 text-slate-800 border border-slate-200 hover:bg-white shadow hover:shadow-md focus-visible:ring-slate-300 disabled:opacity-60 disabled:cursor-not-allowed',
    outline:
      'border border-slate-400 text-slate-900 bg-white hover:bg-slate-50 focus-visible:ring-slate-300 disabled:opacity-60 disabled:cursor-not-allowed',
    danger:
      'bg-rose-500 hover:bg-rose-600 text-white focus-visible:ring-rose-300 shadow-lg shadow-rose-200 disabled:opacity-60 disabled:cursor-not-allowed',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 focus-visible:ring-slate-200 disabled:opacity-60 disabled:cursor-not-allowed',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
