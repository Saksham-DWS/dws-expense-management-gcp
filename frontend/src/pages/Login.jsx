import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '../services/authService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import AuthShell from '../components/auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import dwsLogo from '../assets/dws.png';

const Login = () => {
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '', role: 'Super Admin' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const roleSlugMap = {
    'super-admin': 'Super Admin',
    superadmin: 'Super Admin',
    mis: 'MIS Manager',
    'mis-manager': 'MIS Manager',
    bu: 'BU Admin',
    'bu-admin': 'BU Admin',
    spoc: 'SPOC',
    handler: 'Service Handler',
    'service-handler': 'Service Handler',
  };
  const roleApiMap = {
    'Super Admin': 'super_admin',
    'MIS Manager': 'mis_manager',
    'BU Admin': 'business_unit_admin',
    SPOC: 'spoc',
    'Service Handler': 'service_handler',
  };
  const quickRoleLinks = [
    { label: 'Super Admin', slug: 'super-admin' },
    { label: 'MIS Manager', slug: 'mis' },
    { label: 'BU Admin', slug: 'bu-admin' },
    { label: 'SPOC', slug: 'spoc' },
    { label: 'Service Handler', slug: 'service-handler' },
  ];

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (roleParam) {
      const mappedRole = roleSlugMap[roleParam.toLowerCase()] || 'Super Admin';
      setFormData((prev) => ({ ...prev, role: mappedRole }));
    }
  }, [roleParam]);

  const handleChange = (e) =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiRole = roleApiMap[formData.role];
      if (!apiRole) {
        toast.error('Please pick a valid role to continue.');
        setLoading(false);
        return;
      }
      const response = await login(formData.email, formData.password, apiRole);
      if (!response?.success) {
        toast.error(response?.message || 'Login failed. Please check your credentials and selected role.');
        setLoading(false);
        return;
      }
      if (response.success) {
        setUser(response.data);
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
        }
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.response?.status === 401
          ? 'Incorrect role selected for this account. Please choose the correct role and try again.'
          : 'Login failed. Please try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const helperCard = (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-18 w-22 rounded-2xl bg-black flex items-center justify-center shadow-lg px-4 py-3">
          <img src={dwsLogo} alt="DWS" className="h-14 object-contain" />
        </div>
        <div className="text-white">
          <p className="text-xs tracking-[0.2em] uppercase">DWS</p>
          <h2 className="text-3xl font-semibold leading-tight">Expense Management Ecosystem</h2>
        </div>
      </div>
      <p className="mt-4 text-white/80 leading-relaxed">
        Manage every stream of spend in one place with smart controls across cards, services, and business units.
      </p>
    </div>
  );

  return (
    <AuthShell helperCard={helperCard} footer="(c) 2025 Expense Management Ecosystem. All rights reserved.">
      <div className="max-w-md w-full space-y-6 mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome Back!</h1>
          <p className="text-sm text-slate-500">Please sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@example.com"
            required
            icon={<Mail size={16} />}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            icon={<Lock size={16} />}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Select Role (Required)</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option>Super Admin</option>
              <option>MIS Manager</option>
              <option>BU Admin</option>
              <option>SPOC</option>
              <option>Service Handler</option>
            </select>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickRoleLinks.map((link) => (
                <button
                  key={link.slug}
                  type="button"
                  onClick={() => navigate(`/login/${link.slug}`)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    formData.role === link.label ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-300"
              />
              Remember me
            </label>
            <Link to="#" className="font-semibold text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-500">
          First-time setup?{' '}
          <Link to="/setup" className="font-semibold text-primary-600 hover:text-primary-700">
            Create Super Admin
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default Login;
