import { format } from 'date-fns';

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date, formatStr = 'dd-MMM-yy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return format(new Date(date), 'dd-MMM-yy HH:mm');
};

export const getMonthYear = (date) => {
  if (!date) return '';
  return format(new Date(date), 'MMM-yyyy');
};

export const getRoleName = (role) => {
  const roleNames = {
    super_admin: 'Super Admin',
    mis_manager: 'MIS Manager',
    business_unit_admin: 'Business Unit Admin',
    spoc: 'SPOC',
    service_handler: 'Service Handler',
  };
  return roleNames[role] || role;
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Declined: 'bg-rose-50 text-rose-700 border border-rose-100',
    Deactive: 'bg-slate-100 text-slate-700 border border-slate-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-100',
    Accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-100',
    Unique: 'bg-sky-50 text-sky-700 border border-sky-100',
    Merged: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
  };
  return colors[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
};

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
