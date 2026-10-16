import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Main application layout.
 * Enforces centered content with ~1100px max width, 8px grid whitespace,
 * and high-contrast light / dark backgrounds adhering to DESIGN.md.
 */
export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150 antialiased selection:bg-brand-500 selection:text-white">
      {/* Subtle ambient gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-500/5 dark:bg-brand-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[300px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 max-w-content w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
