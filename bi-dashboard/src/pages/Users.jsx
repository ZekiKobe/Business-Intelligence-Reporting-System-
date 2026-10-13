import { Plus, Filter, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import UserCreationPopup from '../components/UserCreationPopup';
import BiPageHeader from '../components/BiPageHeader';
import { deleteUser, getUsers } from '../controllers/userController';
import { toast } from 'react-toastify';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTrackPageLoading } from '../context/LoadingBarContext';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [search, setSearch] = useState('');

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useTrackPageLoading(loading);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const rows = await getUsers();
      setUsers(rows || []);
    } catch (e) {
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = () => {
    loadUsers();
  };

  const handleDeleteUser = async (user) => {
    if (!user) return;
    try {
      setRemoving(true);
      await deleteUser(user.id);
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
      toast.success(`Removed ${user.name || user.username}`);
      setUserToRemove(null);
    } catch (e) {
      const detail = e?.response?.data?.detail || 'Unable to remove user';
      toast.error(detail);
    } finally {
      setRemoving(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) => {
      const matchesRole = selectedRole === 'All Roles' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'All Statuses' || user.status === selectedStatus;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(user.name || '').toLowerCase().includes(q) ||
        String(user.email || '').toLowerCase().includes(q) ||
        String(user.username || '').toLowerCase().includes(q);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, selectedRole, selectedStatus, search]);

  return (
    <div className="ui-shell max-w-[1600px] mx-auto pb-10">
      <div className="mb-8">
        <BiPageHeader
          eyebrow="Governance"
          title="Workspace users"
          description="Provision accounts, roles, and audit who can design reports versus consume them."
          badges={[{ label: `${users.length} account${users.length === 1 ? "" : "s"}` }]}
          accent="teal"
          actions={
            <button type="button" onClick={() => setIsPopupOpen(true)} className="ui-btn-primary">
              <Plus size={18} /> New user
            </button>
          }
        />
      </div>

      <div className="surface-card p-4 md:p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center text-sm font-semibold opacity-70">
            <Filter size={16} className="mr-2 opacity-50" />
            Filters
          </div>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="ui-select w-auto min-w-[140px]">
            <option>All Roles</option>
            <option>Admin</option>
            <option>Editor</option>
            <option>Viewer</option>
          </select>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="ui-select w-auto min-w-[150px]">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <input
            type="search"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input flex-1 min-w-[12rem] max-w-md"
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ui-pro-table min-w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm" style={{ color: "var(--surface-muted)" }}>
                    Loading users…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-red-600">
                    {error}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm" style={{ color: "var(--surface-muted)" }}>
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}
                        >
                          {String(user.name || "U").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ color: "var(--surface-text)" }}>
                            {user.name}
                          </div>
                          <div className="text-xs truncate opacity-65">{user.email}</div>
                          <div className="text-xs truncate opacity-65">Username: {user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap opacity-80">{user.role}</td>
                    <td className="whitespace-nowrap">
                      <span className={`ui-badge ${user.status === "Active" ? "ui-badge--success" : "ui-badge--danger"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap opacity-75 text-sm">{user.joinDate}</td>
                    <td className="whitespace-nowrap text-right">
                      <button type="button" className="ui-btn-ghost p-2 rounded-lg opacity-70" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        className="ui-btn-ghost p-2 rounded-lg text-red-600"
                        title="Remove"
                        onClick={() => setUserToRemove(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ui-pro-footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>
            Showing{" "}
            <span className="font-semibold tabular-nums" style={{ color: "var(--surface-text)" }}>
              {filteredUsers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums" style={{ color: "var(--surface-text)" }}>
              {users.length}
            </span>{" "}
            users
          </p>
          <nav className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--stroke)" }} aria-label="Pagination">
            <button
              type="button"
              className="ui-btn-ghost px-3 py-1.5 rounded-none border-0 border-r"
              style={{ borderColor: "var(--stroke)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="ui-btn-ghost px-4 py-1.5 rounded-none font-medium text-sm">
              1
            </button>
            <button
              type="button"
              className="ui-btn-ghost px-3 py-1.5 rounded-none border-l"
              style={{ borderColor: "var(--stroke)" }}
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </div>
      </div>
      <UserCreationPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onSave={handleAddUser}
      />
      <ConfirmDialog
        isOpen={Boolean(userToRemove)}
        onClose={() => !removing && setUserToRemove(null)}
        onConfirm={() => handleDeleteUser(userToRemove)}
        loading={removing}
        title="Remove workspace user?"
        description={userToRemove ? `${userToRemove.name || userToRemove.username} will lose access to this workspace and its reports.` : ''}
        confirmLabel="Remove user"
      />
    </div>
  );
};

export default Users;
