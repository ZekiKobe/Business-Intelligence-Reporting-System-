import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import {createUser} from '../controllers/userController';

const roles = ['Admin', 'Editor', 'Viewer'];
const statuses = ['Active', 'Inactive'];

const UserCreationPopup = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(roles[0]);
  const [status, setStatus] = useState(statuses[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');


  const handleSave = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match. Please check and try again.");
      return;
    }

    let userData = {
      name: name,
      username: username,
      email: email,
      role: role,
      status: status,
      password: password,
    }

    try {
      const created = await createUser(userData);
      toast.success(`User ${name} created successfully`);
      onSave?.({
        id: created?.id || Date.now(),
        name,
        username: created?.username || username,
        email,
        role,
        status,
        joinDate: new Date().toISOString().slice(0, 10),
      });

      setName('');
      setUsername('');
      setEmail('');
      setRole(roles[0]);
      setStatus(statuses[0]);
      setPassword('');
      setConfirmPassword('');
      onClose?.();
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || "Error creating user";
      toast.error(typeof detail === "string" ? detail : "Error creating user");
    }
  };
    if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold mb-4">Create New User</h2>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            placeholder="Username (used to sign in)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
           <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
           <input
            type="password"
            placeholder="Confirm password here..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center">
            <Plus size={16} className="mr-2" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCreationPopup;
