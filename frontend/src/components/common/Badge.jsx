import { getStatusBadgeColor } from '../../utils/formatters';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-slate-100/80 text-slate-700 border border-slate-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
  };

  const normalizedChild = typeof children === 'string' ? children.trim() : '';
  const colorClass =
    normalizedChild && ['Active', 'Declined', 'Deactive', 'Pending', 'Accepted', 'Rejected', 'Merged', 'Unique'].includes(normalizedChild)
      ? getStatusBadgeColor(normalizedChild)
      : variants[variant];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[0.7rem] font-semibold tracking-wide uppercase shadow-sm ${colorClass} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
