const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  hint,
  icon,
  className = '',
  ...props
}) => {
  const baseField =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition duration-150 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-100 disabled:cursor-not-allowed';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-gray-700 tracking-wide">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${baseField} ${icon ? 'pl-10' : ''} ${error ? 'ring-2 ring-rose-200' : ''}`}
          {...props}
        />
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default Input;
