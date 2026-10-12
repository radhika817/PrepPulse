import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Globe,
  Flame,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Profile = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Synchronize state if user loads asynchronously
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setTimezone(user.timezone || 'Asia/Kolkata');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (name.trim().length < 2 || name.trim().length > 50) {
      setErrorMessage('Name must be between 2 and 50 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.patch('/users/me', {
        name: name.trim(),
        timezone,
      });

      updateUser(response.data.user);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Extract initials for the avatar
  const initials =
    user?.name
      ? user.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'U';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" />
            <span>Student Profile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal profile and daily challenge timezone settings.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          Phase 4 Active
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Header & Summary */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-indigo-600/30">
            {initials}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Role: {user?.role || 'student'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Flame className="w-3.5 h-3.5" />
                <span>Streak: {user?.streak?.current || 0}d</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email Address</span>
              <span className="text-[10px] text-slate-500 font-normal">(Cannot be modified)</span>
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Display Name</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Timezone</span>
            </label>
            <select
              disabled={loading}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - India Standard Time)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST / EDT)</option>
              <option value="America/Chicago">America/Chicago (CST / CDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
              <option value="Europe/London">Europe/London (GMT / BST)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET / CEST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              The daily 5-question challenge resets at midnight in your selected timezone.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
