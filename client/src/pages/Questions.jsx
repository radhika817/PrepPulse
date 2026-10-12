import { useState } from 'react';
import { Search, Filter, Layers, BookOpen } from 'lucide-react';

export const Questions = () => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'ALL',
    'OS',
    'DBMS',
    'DSA',
    'CN',
    'OOP',
    'SQL',
    'WEB',
    'APTITUDE',
    'HR',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            <span>Question Bank</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and filter interview questions across computer science subjects.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
          Phase 5 Feature
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by topic, keyword, or concept (e.g. Deadlock, BCNF)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none">
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder list */}
      <div className="p-12 text-center rounded-2xl bg-slate-900/30 border border-slate-800 space-y-3">
        <BookOpen className="w-10 h-10 mx-auto text-indigo-400 opacity-80" />
        <h2 className="text-base font-bold text-white">Full Question Listing Coming in Phase 5</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The question bank has been seeded with 20 original questions. Full paginated filtering and search UI will be wired to <code className="text-indigo-400 font-mono">GET /questions</code> in Phase 5.
        </p>
      </div>
    </div>
  );
};

export default Questions;
