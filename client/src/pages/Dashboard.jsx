import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Award,
  Layers,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getDaily } from '../services/daily';
import { getStreak } from '../services/streak';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Skeleton,
} from '../components/ui';

export const Dashboard = () => {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [revisionItems, setRevisionItems] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [streakRes, dailyRes, revisionRes] = await Promise.allSettled([
          getStreak(7),
          getDaily(),
          api.get('/revision'),
        ]);

        if (isMounted) {
          if (streakRes.status === 'fulfilled') {
            setStreakData(streakRes.value);
          }
          if (dailyRes.status === 'fulfilled') {
            setDailyChallenge(dailyRes.value);
          }
          if (revisionRes.status === 'fulfilled') {
            setRevisionItems(revisionRes.value.data?.items || []);
          }
        }
      } catch (err) {
        console.warn('Dashboard loading error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentStreak = streakData?.current || 0;
  const longestStreak = streakData?.longest || 0;
  const dailyCompletedCount = dailyChallenge?.completedCount || 0;
  const dailyTotal = dailyChallenge?.questions?.length || 5;
  const revisionCount = revisionItems.length;

  // Chart data from recent 7-day activity
  const chartData = (streakData?.recentActivity || []).map((day) => {
    const parts = (day.date || '').split('-');
    const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : day.date;
    return {
      date: label,
      fullDate: day.date,
      completed: day.completed ? 1 : 0,
      score: day.completed ? 100 : 0,
    };
  });

  // Recharts theme tokens
  const chartGridColor = isDark ? '#334155' : '#E2E8F0';
  const chartTextColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

  const isBrandNewUser = currentStreak === 0 && dailyCompletedCount === 0 && revisionCount === 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            <span>Preparation Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track daily consistency, recall performance, and targeted weak topics.
          </p>
        </div>

        <Link to="/daily">
          <Button variant="primary" size="md" className="shadow-sm">
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>Today&apos;s Challenge ({dailyCompletedCount}/{dailyTotal})</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          {/* Top Stat Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Streak Card */}
            <Card className="p-5 hover:border-orange-300 dark:hover:border-orange-800 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Current Streak
                </span>
                <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {currentStreak}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Personal best: <span className="font-semibold text-slate-700 dark:text-slate-300">{longestStreak} days</span>
              </p>
            </Card>

            {/* Daily Solved Card */}
            <Card className="p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Today&apos;s Five
                </span>
                <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {dailyCompletedCount} / {dailyTotal}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {dailyCompletedCount === dailyTotal ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All completed today!
                  </span>
                ) : (
                  `${dailyTotal - dailyCompletedCount} pending today`
                )}
              </p>
            </Card>

            {/* Recall Accuracy Card */}
            <Card className="p-5 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recall Status
                </span>
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                Active
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Self-graded recall flow
              </p>
            </Card>

            {/* Revision Due Card */}
            <Card className="p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Revision Due
                </span>
                <RotateCcw className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {revisionCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Questions due in Leitner queue
              </p>
            </Card>
          </div>

          {/* Friendly Empty State if Brand New User */}
          {isBrandNewUser && (
            <Card className="p-6 sm:p-8 bg-brand-50/50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/60 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Welcome to PrepPulse! Start your first challenge.
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                    Solve your first 5 daily questions to start your streak, build recall memory, and let PrepPulse calibrate your weak topics.
                  </p>
                </div>
                <Link to="/daily">
                  <Button variant="primary" size="md">
                    <span>Start Today&apos;s Challenge</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Recharts Activity & Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Activity Chart (2 cols) */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>7-Day Practice Consistency</CardTitle>
                    <CardDescription>
                      Visual representation of your daily challenge completions over the past week.
                    </CardDescription>
                  </div>
                  <Badge variant="primary" size="sm">
                    Activity
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {chartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartGridColor}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          stroke={chartTextColor}
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: chartGridColor }}
                        />
                        <YAxis
                          stroke={chartTextColor}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                          ticks={[0, 50, 100]}
                          tickFormatter={(val) => (val === 100 ? 'Done' : val === 0 ? 'Miss' : '')}
                        />
                        <Tooltip
                          cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div
                                  style={{
                                    backgroundColor: tooltipBg,
                                    borderColor: tooltipBorder,
                                    color: tooltipText,
                                  }}
                                  className="p-2.5 rounded-xl border text-xs shadow-lg space-y-1"
                                >
                                  <p className="font-semibold">{data.fullDate}</p>
                                  <p className="text-slate-500 dark:text-slate-400">
                                    Status: {data.completed ? 'Challenge Completed' : 'Incomplete'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="score"
                          fill="#4F46E5"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                    No activity data available yet. Complete challenges to see your trend!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column: Revise-Now Card & Weak Topics */}
            <div className="space-y-6">
              {/* Revise-Now Card */}
              <Card className="p-5 space-y-4 shadow-sm border-brand-200 dark:border-brand-900/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Spaced Revision
                    </h3>
                  </div>
                  <Badge variant={revisionCount > 0 ? 'primary' : 'default'} size="sm">
                    {revisionCount} due
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {revisionCount > 0
                    ? `You have ${revisionCount} question${revisionCount === 1 ? '' : 's'} scheduled for recall reinforcement today.`
                    : 'Your spaced repetition queue is clear! Questions you miss in practice will appear here after 1, 3, or 7 days.'}
                </p>

                {revisionCount > 0 ? (
                  <Link to="/revision">
                    <Button variant="primary" size="sm" className="w-full">
                      <span>Revise Now ({revisionCount})</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/questions">
                    <Button variant="secondary" size="sm" className="w-full">
                      <span>Practice New Questions</span>
                    </Button>
                  </Link>
                )}
              </Card>

              {/* Weak Topics Card */}
              <Card className="p-5 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Target Weak Topics
                    </h3>
                  </div>
                  <Badge variant="medium" size="sm">
                    Adaptive
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Topics where recall falls below 60% are automatically injected into your Daily 5 challenge.
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Operating Systems
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      Core placement
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      DBMS & SQL
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      Core placement
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
