import { User, Mail, Globe, Flame, Shield } from 'lucide-react';

export const Profile = () => {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" />
            <span>Student Profile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Account settings and streak preferences.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 4 Feature
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-indigo-600/30">
            RS
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Student User</h2>
            <div className="inline-flex items-center gap-1 text-xs text-indigo-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Role: Student</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>Email</span>
            </span>
            <span className="text-slate-200 font-mono">student@example.com</span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              <span>Timezone</span>
            </span>
            <span className="text-slate-200 font-medium">Asia/Kolkata (IST)</span>
          </div>

          <div className="flex items-center justify-between py-2 text-xs">
            <span className="text-slate-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Streak Record</span>
            </span>
            <span className="text-slate-200 font-medium">0 Current / 0 Longest</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
