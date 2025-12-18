import { useState } from 'react';
import { User, Mail, Briefcase, Building2, Shield, Calendar } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { getRoleName, formatDateTime } from '../utils/formatters';
import toast from 'react-hot-toast';
import { updateMe } from '../services/authService';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const wantsPasswordChange =
      formData.currentPassword || formData.newPassword || formData.confirmPassword;

    if (wantsPasswordChange && !formData.currentPassword) {
      toast.error('Please enter your current password to set a new one');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        email: formData.email,
      };

      if (wantsPasswordChange) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      const response = await updateMe(payload);
      if (response.success) {
        setUser(response.data);
        toast.success('Profile updated successfully');
        setIsEditing(false);
        setFormData((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        toast.error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account information and settings</p>
        </div>

        {/* Profile Overview */}
        <Card>
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                <User size={48} className="text-white" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{user?.name}</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-700">{user?.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield size={16} className="text-gray-400" />
                  <Badge variant="info">{getRoleName(user?.role)}</Badge>
                </div>
                {user?.businessUnit && (
                  <div className="flex items-center space-x-2">
                    <Building2 size={16} className="text-gray-400" />
                    <span className="text-gray-700">Business Unit: <strong>{user.businessUnit}</strong></span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-600 text-sm">
                    Member since {formatDateTime(user?.createdAt || new Date())}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? 'secondary' : 'primary'}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        {isEditing && (
          <Card title="Edit Profile Information">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="New Password"
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Account Details */}
        <Card title="Account Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
              <p className="text-base text-gray-900">{getRoleName(user?.role)}</p>
            </div>
            {user?.businessUnit && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Business Unit</h4>
                <p className="text-base text-gray-900">{user.businessUnit}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Account Status</h4>
              <Badge variant="success">Active</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Account Created</h4>
              <p className="text-base text-gray-900">
                {formatDateTime(user?.createdAt || new Date())}
              </p>
            </div>
          </div>
        </Card>

        {/* Role Permissions */}
        <Card title="Your Permissions">
          <div className="space-y-3">
            {user?.role === 'super_admin' && (
              <>
                <PermissionItem text="Full system access and control" />
                <PermissionItem text="Create and manage all user accounts" />
                <PermissionItem text="View and edit global expense sheet" />
                <PermissionItem text="Bulk upload and export data" />
              </>
            )}
            {user?.role === 'mis_manager' && (
              <>
                <PermissionItem text="View and manage global expense sheet" />
                <PermissionItem text="Bulk upload expense data" />
                <PermissionItem text="Edit and update all entries" />
                <PermissionItem text="Export expense reports" />
              </>
            )}
            {user?.role === 'business_unit_admin' && (
              <>
                <PermissionItem text={`Manage ${user.businessUnit} business unit`} />
                <PermissionItem text="Approve/reject expense entries" />
                <PermissionItem text="Create SPOC and Service Handler accounts" />
                <PermissionItem text="View business unit expense sheet" />
              </>
            )}
            {user?.role === 'spoc' && (
              <>
                <PermissionItem text={`Enter expenses for ${user.businessUnit}`} />
                <PermissionItem text="Submit entries for approval" />
                <PermissionItem text="View submission status" />
              </>
            )}
            {user?.role === 'service_handler' && (
              <>
                <PermissionItem text="View assigned services" />
                <PermissionItem text="Request service cancellation" />
                <PermissionItem text="Respond to renewal notifications" />
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

const PermissionItem = ({ text }) => (
  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
    <div className="flex-shrink-0">
      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
    <p className="text-sm text-gray-700">{text}</p>
  </div>
);

export default Profile;
