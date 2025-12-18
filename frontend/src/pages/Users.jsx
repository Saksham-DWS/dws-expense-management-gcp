import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import { getUsers, register, updateUser, deleteUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, BUSINESS_UNITS } from '../utils/constants';
import { getRoleName } from '../utils/formatters';
import toast from 'react-hot-toast';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    businessUnit: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditMode(true);
      setFormData({
        id: userToEdit._id,
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        businessUnit: userToEdit.businessUnit || '',
      });
    } else {
      setEditMode(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        businessUnit: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: '',
      businessUnit: '',
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode) {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateUser(formData.id, updateData);
        toast.success('User updated successfully');
      } else {
        await register(formData);
        toast.success('User created successfully');
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter available roles based on current user
  const getAvailableRoles = () => {
    if (user?.role === 'super_admin') {
      return USER_ROLES;
    } else if (user?.role === 'business_unit_admin') {
      return USER_ROLES.filter(r => ['spoc', 'service_handler'].includes(r.value));
    }
    return [];
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <Button onClick={() => handleOpenModal()}>
            <UserPlus size={18} className="mr-2" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <Card>
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <Input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Search size={20} className="text-gray-400" />
          </div>
        </Card>

        {/* Users Table */}
        <Card>
          {loading ? (
            <Loading />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">{getRoleName(u.role)}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.businessUnit || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <Edit size={18} />
                          </button>
                          {user?.role === 'super_admin' && (
                            <button
                              onClick={() => handleDelete(u._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No users found</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Add/Edit User Modal */}
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editMode ? 'Edit User' : 'Add New User'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Input
              label={editMode ? 'Password (leave blank to keep current)' : 'Password'}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!editMode}
            />

            <Select
              label="Role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={getAvailableRoles().map(r => r.value)}
              required
            />

            {['business_unit_admin', 'spoc', 'service_handler'].includes(formData.role) && (
              <Select
                label="Business Unit"
                name="businessUnit"
                value={formData.businessUnit}
                onChange={handleChange}
                options={user?.role === 'super_admin' ? BUSINESS_UNITS : [user?.businessUnit]}
                required
              />
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editMode ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default Users;
