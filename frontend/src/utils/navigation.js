import {
  LayoutDashboard,
  FileText,
  Users,
  Upload,
  Package,
} from 'lucide-react';

export const NAVIGATION_MAP = {
  super_admin: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/expenses', icon: FileText, label: 'Global Expense Sheet' },
    { path: '/users', icon: Users, label: 'Manage Users' },
    { path: '/logs', icon: FileText, label: 'Logs' },
    { path: '/bulk-upload', icon: Upload, label: 'Bulk Upload' },
  ],
  mis_manager: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/expenses', icon: FileText, label: 'Global Expense Sheet' },
    { path: '/logs', icon: FileText, label: 'Logs' },
    { path: '/bulk-upload', icon: Upload, label: 'Bulk Upload' },
  ],
  business_unit_admin: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/expenses', icon: FileText, label: 'Expense Sheet' },
    { path: '/users', icon: Users, label: 'Manage Users' },
    { path: '/logs', icon: FileText, label: 'Logs' },
  ],
  spoc: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/expenses', icon: FileText, label: 'Expense Sheet' },
    { path: '/add-expense', icon: Upload, label: 'Add New Entry' },
  ],
  service_handler: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/my-services', icon: Package, label: 'My Services' },
  ],
};

export const getNavigationForRole = (role) => NAVIGATION_MAP[role] || [];
