import { ChevronDown } from "lucide-react";

const Select = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  placeholder = 'Select an option',
  className = '',
  ...props
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-slate-600 tracking-wide">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm shadow-slate-100 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'ring-2 ring-rose-200' : ''
          }`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          <ChevronDown size={16} />
        </span>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};

export default Select;