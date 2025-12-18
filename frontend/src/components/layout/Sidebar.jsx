import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavigationForRole } from '../../utils/navigation';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const items = getNavigationForRole(user?.role);
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-72 flex-shrink-0 flex-col border-r border-white/60 bg-white/85 backdrop-blur-2xl shadow-2xl pt-24 pb-10 overflow-y-auto subtle-scrollbar">
      <div className="flex-1 px-6 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Control</p>
          <h2 className="text-2xl font-semibold text-slate-900">Command Center</h2>
          <p className="text-xs text-slate-500 mt-1">Manage every stream of spend in one place</p>
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'brand-gradient text-white shadow-lg shadow-black/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    active ? 'border-white/40 bg-white/20' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-primary-500'} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-6 pb-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
          Need a walkthrough? <span className="font-semibold text-slate-900">Reach the MIS desk</span> for concierge
          onboarding.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
