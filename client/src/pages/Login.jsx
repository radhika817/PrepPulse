import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardContent, Input } from '../components/ui';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [wakingMessage, setWakingMessage] = useState('');
  const timerRef = useRef(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

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

    // Basic client-side validation
    if (!email.trim() || !password) {
      setErrorMessage('Please fill in both email and password');
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      setWakingMessage('Server is waking up, this can take up to a minute...');
    }, 5000);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to log in. Please check your credentials.'
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
    <div className="max-w-md mx-auto py-10 sm:py-14">
      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in to resume your daily streak and interview preparation
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
              label="Email Address"
              id="login-email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
            />

            <Input
              label="Password"
              id="login-password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={loading || Boolean(wakingMessage)}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Sign up for free
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
