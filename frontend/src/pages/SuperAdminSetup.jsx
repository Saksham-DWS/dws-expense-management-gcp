import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import AuthShell from '../components/auth/AuthShell';
import { superAdminSignup, getBootstrapStatus } from '../services/authService';

const SuperAdminSetup = () => {
  const navigate = useNavigate();
  const [statusLoading, setStatusLoading] = useState(true);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', setupKey: '' });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await getBootstrapStatus();
        if (response.success) {
          setHasSuperAdmin(response.data.hasSuperAdmin);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to verify setup status.');
      } finally {
        setStatusLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleChange = (e) =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        setupKey: formData.setupKey.trim(),
      };
      const response = await superAdminSignup(payload);
      if (response.success) {
        toast.success('Super Admin created successfully. You can now log in.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create Super Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (statusLoading) {
    return <Loading fullScreen label="Verifying bootstrap state" />;
  }

  const helperCard = (
    <div className="space-y-6">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
        <ShieldCheck size={22} />
      </div>
      <div>
        <h2 className="text-3xl font-semibold text-white leading-tight">Provision the Super Admin</h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          Launch the ecosystem with the first Super Admin to unlock global controls, user provisioning, and MIS workflows.
        </p>
      </div>
      <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85 space-y-2">
        <p className="font-semibold text-white">Security Checklist</p>
        <div className="flex items-center gap-2 text-white/85">
          <KeyRound size={14} /> Store the setup key in a secrets manager.
        </div>
        <div className="flex items-center gap-2 text-white/85">
          <Lock size={14} /> Rotate/delete the setup key after onboarding.
        </div>
        <div className="flex items-center gap-2 text-white/85">
          <UserRound size={14} /> Invite MIS & BU Admins from Users once ready.
        </div>
      </div>
    </div>
  );

  return (
    <AuthShell helperCard={helperCard} footer={<span className="text-slate-600">Have credentials already? <Link to="/login" className="text-primary-600 font-semibold">Return to login</Link></span>}>
      <div className="max-w-md mx-auto w-full space-y-6">
        {hasSuperAdmin ? (
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-semibold text-slate-900">Already configured</h1>
            <p className="text-slate-500">This workspace already has a Super Admin. Continue to the login portal.</p>
            <Button onClick={() => navigate('/login')}>Go to login</Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-slate-900">Create the first Super Admin</h1>
              <p className="text-sm text-slate-500">One secure form to bootstrap the platform.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" required icon={<UserRound size={16} />} />
              <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="super.admin@company.com" required icon={<Mail size={16} />} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Strong password" required icon={<Lock size={16} />} />
                <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" required icon={<Lock size={16} />} />
              </div>
              <Input label="Setup Key" type="password" name="setupKey" value={formData.setupKey} onChange={handleChange} placeholder="One-time setup key from backend .env" required icon={<KeyRound size={16} />} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                This form is for the very first Super Admin only. Use the setup key from your backend <code>.env</code>. After creation, log in and invite other roles from Users.
              </div>
              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? 'Creating Super Admin...' : 'Create Super Admin'}
              </Button>
              <div className="text-center text-sm text-slate-500">
                Need the setup key? Check with your DevOps owner.
              </div>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default SuperAdminSetup;
