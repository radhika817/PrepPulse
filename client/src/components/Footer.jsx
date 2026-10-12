export const Footer = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="font-semibold text-slate-200">PrepPulse 🎯</span>
          <span>— Practice every day. Prepare with purpose.</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <span>Phases 2 & 3: Project Setup</span>
          <span>•</span>
          <span>Asia/Kolkata default</span>
          <span>•</span>
          <span className="text-slate-400 font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
