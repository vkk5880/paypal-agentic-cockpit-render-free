import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
        404 — Page Not Found
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
        The requested resource or page does not exist or has been relocated within the AegisPay cockpit.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
}
