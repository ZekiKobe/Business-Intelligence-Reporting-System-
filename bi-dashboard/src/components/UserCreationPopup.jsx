import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "react-toastify";
import { createUser } from "../controllers/userController";
import Modal from "./Modal";

const roles = ["Admin", "Editor", "Viewer"];
const statuses = ["Active", "Inactive"];

const UserCreationPopup = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [status, setStatus] = useState(statuses[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.warning("Passwords do not match. Please check and try again.");
      return;
    }
    try {
      setSaving(true);
      const created = await createUser({ name, username, email, role, status, password });
      toast.success(`User ${name} created successfully`);
      onSave?.(created);
      setName(""); setUsername(""); setEmail(""); setRole(roles[0]); setStatus(statuses[0]);
      setPassword(""); setConfirmPassword("");
      onClose?.();
    } catch (error) {
      const payload = error?.response?.data;
      const detail = payload?.detail || payload?.username?.[0] || payload?.email?.[0] || error?.message || "Error creating user";
      toast.error(typeof detail === "string" ? detail : "Error creating user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={saving}
      title="Create workspace user"
      description="Choose a unique username. Viewers use it with their password to sign in to the report portal."
      footer={<><button type="button" onClick={onClose} className="ui-btn-secondary" disabled={saving}>Cancel</button><button type="submit" form="create-user-form" className="ui-btn-primary" disabled={saving}><Plus size={16} /> {saving ? "Creating…" : "Create user"}</button></>}
    >
      <form id="create-user-form" onSubmit={handleSave} className="flex flex-col gap-4">
        <label><span className="ui-label">Full name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="ui-input" required /></label>
        <label><span className="ui-label">Username</span><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="ui-input" autoComplete="username" required /><span className="mt-1 block text-xs" style={{ color: "var(--surface-muted)" }}>This is the viewer’s sign-in name.</span></label>
        <label><span className="ui-label">Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="ui-input" required /></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label><span className="ui-label">Role</span><select value={role} onChange={(e) => setRole(e.target.value)} className="ui-select">{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="ui-label">Account status</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="ui-select">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label><span className="ui-label">Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="ui-input" autoComplete="new-password" minLength={8} required /></label>
          <label><span className="ui-label">Confirm password</span><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="ui-input" autoComplete="new-password" minLength={8} required /></label>
        </div>
      </form>
    </Modal>
  );
};

export default UserCreationPopup;
