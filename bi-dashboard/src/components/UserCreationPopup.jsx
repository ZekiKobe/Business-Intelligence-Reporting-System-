import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "react-toastify";
import { createUser, updateUser } from "../controllers/userController";
import Modal from "./Modal";

const roles = ["Admin", "Editor", "Viewer"];
const statuses = ["Active", "Inactive"];

const UserCreationPopup = ({ isOpen, onClose, onSave, userToEdit = null }) => {
  const isEditing = Boolean(userToEdit);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [status, setStatus] = useState(statuses[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setName(userToEdit.name || "");
        setUsername(userToEdit.username || "");
        setEmail(userToEdit.email || "");
        setRole(userToEdit.role || roles[0]);
        setStatus(userToEdit.status || statuses[0]);
        setPassword("");
        setConfirmPassword("");
      } else {
        setName("");
        setUsername("");
        setEmail("");
        setRole(roles[0]);
        setStatus(statuses[0]);
        setPassword("");
        setConfirmPassword("");
      }
    }
  }, [isOpen, userToEdit]);

  const handleSave = async (event) => {
    event.preventDefault();

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        toast.warning("Passwords do not match. Please check and try again.");
        return;
      }
      if (password.length < 8) {
        toast.warning("Password must be at least 8 characters long.");
        return;
      }
    } else if (!isEditing) {
      toast.warning("Password is required when creating a new user.");
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        const payload = {
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
          status,
        };
        if (password) {
          payload.password = password;
        }
        const updated = await updateUser(userToEdit.id, payload);
        toast.success(`User ${name || username} updated successfully`);
        onSave?.(updated);
        onClose?.();
      } else {
        const created = await createUser({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          role,
          status,
          password,
        });
        toast.success(`User ${name || username} created successfully`);
        onSave?.(created);
        setName("");
        setUsername("");
        setEmail("");
        setRole(roles[0]);
        setStatus(statuses[0]);
        setPassword("");
        setConfirmPassword("");
        onClose?.();
      }
    } catch (error) {
      const payload = error?.response?.data;
      const detail =
        payload?.detail ||
        payload?.username?.[0] ||
        payload?.email?.[0] ||
        payload?.password?.[0] ||
        error?.message ||
        (isEditing ? "Error updating user" : "Error creating user");
      toast.error(typeof detail === "string" ? detail : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeDisabled={saving}
      title={isEditing ? "Edit workspace user" : "Create workspace user"}
      description={
        isEditing
          ? "Update user profile details, workspace role permissions, or sign-in credentials."
          : "Choose a unique username. Viewers use it with their password to sign in to the report portal."
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="ui-btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="ui-btn-primary" disabled={saving}>
            {isEditing ? <Check size={16} /> : <Plus size={16} />}
            {saving ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save changes" : "Create user")}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSave} className="flex flex-col gap-4">
        <label>
          <span className="ui-label">Full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ui-input"
            placeholder="e.g. Alex Morgan"
            required
          />
        </label>
        <label>
          <span className="ui-label">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="ui-input"
            autoComplete="username"
            placeholder="e.g. alex_m"
            required
          />
          <span className="mt-1 block text-xs" style={{ color: "var(--surface-muted)" }}>
            This is the viewer’s sign-in name.
          </span>
        </label>
        <label>
          <span className="ui-label">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ui-input"
            placeholder="e.g. alex.morgan@example.com"
            required
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span className="ui-label">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="ui-select">
              {roles.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="ui-label">Account status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="ui-select">
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span className="ui-label">
              Password {isEditing && <span className="text-xs font-normal opacity-60">(optional)</span>}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input"
              autoComplete="new-password"
              placeholder={isEditing ? "Leave blank to keep current" : "•••••••• (min 8 characters)"}
              minLength={8}
              required={!isEditing}
            />
          </label>
          <label>
            <span className="ui-label">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="ui-input"
              autoComplete="new-password"
              placeholder={isEditing ? "Leave blank to keep current" : "•••••••• (repeat password)"}
              minLength={8}
              required={!isEditing && Boolean(password)}
            />
          </label>
        </div>
      </form>
    </Modal>
  );
};

export default UserCreationPopup;
