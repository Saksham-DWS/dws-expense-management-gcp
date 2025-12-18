import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div
        className={`relative w-full ${sizes[size]} glass-panel rounded-3xl overflow-hidden shadow-2xl animate-[fadeIn_0.2s_ease-out] max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/60">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Control Center</p>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/80 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
