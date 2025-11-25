'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth/api';
import { Role, Privilege, type User, type CreateUserRequest, type UpdateUserRequest } from '@/types/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Edit and Delete modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [editSelectedRoles, setEditSelectedRoles] = useState<Role[]>([]);
  const [editPrivileges, setEditPrivileges] = useState<Record<Role, Privilege>>({} as Record<Role, Privilege>);

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

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: '', // Always start with empty password
    });
    setEditSelectedRoles(user.roles);

    // Initialize with VIEWER for all roles (ideally fetch from backend)
    const initialPrivileges: Record<Role, Privilege> = {} as Record<Role, Privilege>;
    user.roles.forEach(role => {
      initialPrivileges[role] = Privilege.VIEWER;
    });
    setEditPrivileges(initialPrivileges);

    setShowEditModal(true);
  };

  const handleEditRoleToggle = (role: Role) => {
    if (editSelectedRoles.includes(role)) {
      setEditSelectedRoles(editSelectedRoles.filter(r => r !== role));
      const newPrivileges = { ...editPrivileges };
      delete newPrivileges[role];
      setEditPrivileges(newPrivileges);
    } else {
      setEditSelectedRoles([...editSelectedRoles, role]);
      setEditPrivileges({ ...editPrivileges, [role]: Privilege.VIEWER });
    }
  };

  const handleEditPrivilegeChange = (role: Role, privilege: Privilege) => {
    setEditPrivileges({ ...editPrivileges, [role]: privilege });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUser) return;

    if (editSelectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      const updateData: UpdateUserRequest = {
        name: editFormData.name,
        email: editFormData.email,
        roles: editSelectedRoles,
        privileges: editPrivileges,
      };

      // Only include password if it's not empty
      if (editFormData.password.trim() !== '') {
        updateData.password = editFormData.password;
      }

      await authApi.updateUser(selectedUser.userId, updateData);
      setSuccess('User updated successfully!');
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    setError('');
    setSuccess('');

    // Prevent deleting currently logged-in user
    if (user?.userId === selectedUser.userId) {
      setError('Cannot delete your own account while logged in');
      return;
    }

    try {
      await authApi.deleteUser(selectedUser.userId);
      setSuccess('User deleted successfully!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.roles.join(', ')}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

      {/* Edit User Dialog */}
      {showEditModal && selectedUser && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information. Leave password blank to keep existing password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit}>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">
                    Password <span className="text-gray-500 text-sm">(optional - leave blank to keep existing)</span>
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Roles & Privileges</Label>
                  {Object.values(Role).filter(r => r !== Role.LEARNER).map((role) => (
                    <div key={role} className="rounded-md border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${role}`}
                          checked={editSelectedRoles.includes(role)}
                          onCheckedChange={() => handleEditRoleToggle(role)}
                        />
                        <Label htmlFor={`edit-${role}`} className="font-medium cursor-pointer">
                          {role}
                        </Label>
                      </div>
                      {editSelectedRoles.includes(role) && (
                        <div className="ml-6">
                          <Select
                            value={editPrivileges[role]}
                            onValueChange={(value) => handleEditPrivilegeChange(role, value as Privilege)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={Privilege.VIEWER}>VIEWER</SelectItem>
                              <SelectItem value={Privilege.EDITOR}>EDITOR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteModal && selectedUser && (
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="py-4 space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Name:</span> {selectedUser.name}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Email:</span> {selectedUser.email}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Roles:</span> {selectedUser.roles.join(', ')}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Created:</span>{' '}
                {new Date(selectedUser.created_at).toLocaleDateString()}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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