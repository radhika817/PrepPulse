import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardContent, Input, Select } from '../components/ui';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wakingMessage, setWakingMessage] = useState('');
  const timerRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setWakingMessage('');

    // Client-side validation matching server rules
    if (name.trim().length < 2 || name.trim().length > 50) {
      setErrorMessage('Name must be between 2 and 50 characters');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please provide a valid email address');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      setErrorMessage('Password must contain at least one letter and one number');
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      setWakingMessage('Server is waking up, this can take up to a minute...');
    }, 5000);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        timezone,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || 'Registration failed. Please check your details.'
      );
    } finally {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setWakingMessage('');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 sm:py-12">
      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Create your account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Join PrepPulse and start building your daily interview preparation streak
            </p>
          </div>

          {/* API Error Notification */}
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Server Waking Up Notification */}
          {wakingMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300"
            >
              <Loader2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-spin" />
              <span className="leading-relaxed">{wakingMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              id="register-name"
              type="text"
              required
              disabled={loading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Radhika Sharma"
            />

            <Input
              label="Email Address"
              id="register-email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />

            <Input
              label="Password"
              id="register-password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              helperText="At least 8 characters, one letter and one number"
            />

            <Select
              label="Timezone (for daily challenge reset)"
              id="register-timezone"
              disabled={loading}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - India)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </Select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={loading || Boolean(wakingMessage)}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
