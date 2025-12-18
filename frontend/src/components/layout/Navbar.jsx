import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import { getRoleName } from '../../utils/formatters';
import { getNavigationForRole } from '../../utils/navigation';
import dwsLogo from '../../assets/dws.png';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [notificationCount] = useState(0);
  const navigationItems = getNavigationForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const RoleBadge = () => (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
      <ShieldCheck size={14} />
      {getRoleName(user?.role)}
    </span>
  );

  const NavLinks = () => (
    <div className="hidden md:flex items-center gap-3 ml-4 md:ml-6 overflow-x-auto whitespace-nowrap pr-2">
      {navigationItems.map(({ path, label }) => {
        const active = window.location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
              active ? 'bg-primary-50 text-primary-700 border border-primary-100' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="inline-flex h-12 w-16 items-center justify-center rounded-xl bg-black p-1 shadow">
              <img src={dwsLogo} alt="DWS Logo" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">DWS Expense Manager</p>
              <p className="text-sm font-semibold text-slate-900">Expense Management Ecosystem</p>
            </div>
          </Link>
          <NavLinks />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <RoleBadge />
          <Link
            to="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:text-primary-600 transition-colors"
          >
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[0.65rem] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm hover:shadow"
              aria-label="Open profile menu"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white font-semibold uppercase">
                {user?.name?.split(' ')?.map((n) => n[0]).slice(0, 2).join('') || 'SA'}
              </div>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-100 bg-white shadow-lg">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User size={16} /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shadow-sm"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {showMobileMenu && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-md md:hidden">
          <div className="space-y-3">
            <RoleBadge />
            {navigationItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 text-slate-700"
                onClick={() => setShowMobileMenu(false)}
              >
                <Icon size={18} /> {label}
              </Link>
            ))}
            <Link
              to="/notifications"
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 text-slate-700"
              onClick={() => setShowMobileMenu(false)}
            >
              <Bell size={18} /> Notifications
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3 text-slate-700"
              onClick={() => setShowMobileMenu(false)}
            >
              <User size={18} /> Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg bg-rose-50 px-4 py-3 text-rose-600"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
