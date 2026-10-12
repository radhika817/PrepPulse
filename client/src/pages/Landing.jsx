import { Link } from 'react-router-dom';
import {
  Calendar,
  Eye,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Target,
  CheckCircle,
} from 'lucide-react';

export const Landing = () => {
  return (
    <div className="space-y-16 py-6">
      {/* Hero section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PrepPulse: Engineering Interview Prep Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Practice every day.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
            Prepare with purpose.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Built for engineering students preparing for campus placements and off-campus roles.
          Combines a daily 5-question challenge, self-graded recall practice, streaks, and smart revision.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/daily"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
          >
            <span>Start Today's Challenge</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/questions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700 transition-all hover:border-slate-600"
          >
            <span>Browse Question Bank</span>
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Adaptive Daily Five</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every day, solve 5 targeted questions (3 general + 2 tailored to your weakest topics) to build lasting recall and consistency.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
            <Eye className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Show Answer & Self-Rating</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Rate your recall on core theory questions (Knew it / Partly / Missed it). Zero friction, natural learning without auto-grading hurdles.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Spaced Repetition Queue</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Questions you miss return automatically after 1, 3, and 7 days. Fix your blind spots before your real interview.
          </p>
        </div>
      </section>

      {/* Topics Covered */}
      <section className="rounded-2xl bg-slate-900/30 border border-slate-800/80 p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm font-semibold">
          <Target className="w-4 h-4" />
          <span>Curated Core Subjects for Placements</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {['Operating Systems', 'DBMS & SQL', 'Data Structures & Algorithms', 'Computer Networks', 'Object-Oriented Programming', 'Campus Aptitude', 'HR Rounds'].map((subj) => (
            <span
              key={subj}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/60 text-slate-300 border border-slate-700/50"
            >
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              {subj}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;
