import { Link } from 'react-router-dom';
import {
  Calendar,
  Eye,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Button, Card } from '../components/ui';

export const Landing = () => {
  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PrepPulse: Engineering Interview Preparation</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
          Practice every day.{' '}
          <span className="text-brand-600 dark:text-brand-400">
            Prepare with purpose.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Built specifically for engineering students targeting campus placements and core technical interviews.
          Master operating systems, databases, networks, and algorithms with a daily 5-question habit, active recall, and spaced revision.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/register">
            <Button size="lg" className="shadow-md">
              <span>Sign up for free</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/daily">
            <Button variant="secondary" size="lg">
              <span>Today&apos;s Challenge</span>
            </Button>
          </Link>
          <Link to="/questions">
            <Button variant="ghost" size="lg">
              <BookOpen className="w-4 h-4 mr-1.5 opacity-70" />
              <span>Browse Question Bank</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Core workflow features */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Daily Five */}
        <Card className="p-6 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 border border-brand-100 dark:border-brand-900">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              The Daily Five
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every day, solve five targeted questions: three core concepts plus two focused on your weakest topics to reinforce retention.
            </p>
          </div>
        </Card>

        {/* Show Answer & Active Recall */}
        <Card className="p-6 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 border border-brand-100 dark:border-brand-900">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Show Answer & Recall
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Formulate your response, reveal the model answer, and rate your honest recall: Knew it, Partly, or Missed it. No busywork.
            </p>
          </div>
        </Card>

        {/* Streaks */}
        <Card className="p-6 flex flex-col justify-between hover:border-orange-300 dark:hover:border-orange-700 transition-all">
          <div>
            <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 border border-orange-100 dark:border-orange-900">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Streaks & Consistency
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Build daily momentum. Completing your five questions keeps your flame alive and turns interview prep into a steady habit.
            </p>
          </div>
        </Card>

        {/* Spaced Revision */}
        <Card className="p-6 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-all">
          <div>
            <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 border border-brand-100 dark:border-brand-900">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Spaced Revision
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Questions you missed or found challenging return on a 1, 3, and 7-day Leitner schedule until you truly master them.
            </p>
          </div>
        </Card>
      </section>

      {/* Core Topics Covered */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400">
          Curated Placement & Core Curriculum
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Topics selected from placement screening tests, online assessments (OA), and technical interviews.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {[
            'Operating Systems',
            'DBMS & SQL',
            'Data Structures & Algorithms',
            'Computer Networks',
            'Object-Oriented Programming',
            'System Design Basics',
            'Aptitude & Reasoning',
          ].map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;
