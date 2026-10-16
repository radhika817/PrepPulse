import { useState, useEffect } from 'react';
import {
  User,
  Flame,
  Shield,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
} from '../components/ui';

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
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <User className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Student Profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile and daily challenge timezone settings.
          </p>
        </div>
        <Badge variant="primary" size="md">
          {user?.role || 'student'}
        </Badge>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Card & Form */}
      <Card className="p-6 sm:p-7 space-y-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-brand-600/30">
            {initials}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{user?.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Role: {user?.role || 'student'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Streak: {user?.streak?.current || 0}d</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Input
            label="Email Address"
            type="email"
            disabled
            value={user?.email || ''}
            helperText="Email address cannot be changed."
            className="cursor-not-allowed opacity-60 font-mono"
          />

          <Input
            label="Display Name"
            type="text"
            required
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />

          <Select
            label="Timezone"
            disabled={loading}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            helperText="The daily 5-question challenge resets at midnight in your selected timezone."
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
          </Select>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={loading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
