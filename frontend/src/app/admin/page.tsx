'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth/api';
import { Role, Privilege, type User, type CreateUserRequest } from '@/types/auth';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | Role>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [privileges, setPrivileges] = useState<Record<Role, Privilege>>({} as Record<Role, Privilege>);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedDepartment === 'all') {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => u.roles.includes(selectedDepartment)));
    }
  }, [selectedDepartment, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await authApi.getAllUsers();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role: Role) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
      const newPrivileges = { ...privileges };
      delete newPrivileges[role];
      setPrivileges(newPrivileges);
    } else {
      setSelectedRoles([...selectedRoles, role]);
      setPrivileges({ ...privileges, [role]: Privilege.VIEWER });
    }
  };

  const handlePrivilegeChange = (role: Role, privilege: Privilege) => {
    setPrivileges({ ...privileges, [role]: privilege });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      const userData: CreateUserRequest = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roles: selectedRoles,
        privileges,
      };

      await authApi.createUser(userData);
      setSuccess('User created successfully!');
      setShowModal(false);
      setFormData({ name: '', email: '', password: '' });
      setSelectedRoles([]);
      setPrivileges({} as Record<Role, Privilege>);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold">PhysioGuidance Admin</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.name} ({user?.roles.join(', ')})
              </span>
              <button
                onClick={logout}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Create New User
          </button>
        </div>

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="department" className="block text-sm font-medium text-gray-700">
            Filter by Department
          </label>
          <select
            id="department"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value as 'all' | Role)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="all">All Users</option>
            <option value={Role.USER}>USER</option>
            <option value={Role.LEARNER}>LEARNER</option>
            <option value={Role.ADMIN}>ADMIN</option>
            <option value={Role.FINANCE}>FINANCE</option>
          </select>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.userId}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {user.roles.join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle z-50">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
                    Create New User
                  </h3>

                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roles & Privileges</label>
                      {Object.values(Role).filter(r => r !== Role.LEARNER).map((role) => (
                        <div key={role} className="mb-3 rounded-md border border-gray-200 p-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={role}
                              checked={selectedRoles.includes(role)}
                              onChange={() => handleRoleToggle(role)}
                              className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={role} className="ml-2 block text-sm font-medium text-gray-700">
                              {role}
                            </label>
                          </div>
                          {selectedRoles.includes(role) && (
                            <div className="ml-6 mt-2">
                              <select
                                value={privileges[role]}
                                onChange={(e) => handlePrivilegeChange(role, e.target.value as Privilege)}
                                className="block w-full rounded-md border border-gray-300 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                              >
                                <option value={Privilege.VIEWER}>VIEWER</option>
                                <option value={Privilege.EDITOR}>EDITOR</option>
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}