import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit2, Eye, EyeOff } from "lucide-react";

const ADMIN_PASSWORD = "Malakar@22";

interface User {
  id: string;
  firstName: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPin, setEditPin] = useState("");

  useEffect(() => {
    if (isAuthed) {
      loadUsers();
    }
  }, [isAuthed]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${authPassword}` },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === ADMIN_PASSWORD) {
      setIsAuthed(true);
      setShowAuthForm(false);
      setError("");
    } else {
      setError("Invalid admin password");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password || !pin) {
      setError("All fields required");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be 4 digits");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authPassword}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          masterPassword: password,
          masterPin: pin,
        }),
      });
      if (!res.ok) throw new Error("Failed to add user");
      setName("");
      setPassword("");
      setPin("");
      await loadUsers();
      setError("");
    } catch (err) {
      setError("Failed to add user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (userId: string) => {
    if (!editName && !editPassword && !editPin) {
      setError("At least one field required");
      return;
    }
    if (editPin && !/^\d{4}$/.test(editPin)) {
      setError("PIN must be 4 digits");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, any> = {};
      if (editName) body.name = editName;
      if (editPassword && editPin) {
        body.masterPassword = editPassword;
        body.masterPin = editPin;
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authPassword}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update user");
      setEditingId(null);
      setEditName("");
      setEditPassword("");
      setEditPin("");
      await loadUsers();
      setError("");
    } catch (err) {
      setError("Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authPassword}` },
      });
      if (!res.ok) throw new Error("Failed to delete user");
      await loadUsers();
    } catch (err) {
      setError("Failed to delete user");
    }
  };

  if (showAuthForm) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 pt-12 min-h-screen flex items-center justify-center"
      >
        <form onSubmit={handleAuthSubmit} className="w-full max-w-xs space-y-4">
          <h2 className="text-2xl font-bold text-white uppercase">
            Admin Access
          </h2>
          <input
            type="password"
            placeholder="Admin Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
          >
            Unlock
          </button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 pt-12 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold uppercase text-white">
          User Management
        </h1>
        <button
          onClick={() => setShowAuthForm(true)}
          className="text-muted-foreground hover:text-white text-sm"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <h2 className="font-bold uppercase text-white">Add New User</h2>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN (4 digits)"
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
            }}
            maxLength={4}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary tracking-[0.3em]"
          />
        </div>

        <button
          onClick={handleAddUser}
          disabled={submitting}
          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add User
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold uppercase text-white">Users</h2>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground">No users yet</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-white">{user.firstName || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              {editingId === user.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-32 bg-background border border-border rounded-lg px-2 py-1 text-white text-sm"
                  />
                  <button
                    onClick={() => handleEditUser(user.id)}
                    disabled={submitting}
                    className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(user.id)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
