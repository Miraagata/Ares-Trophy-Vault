import React, { useMemo } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { runDeepAudit } from '../lib/deepAudit';

export const ValidationBanner = ({ trophies, message }: { trophies?: any[], message?: string }) => {
  const audit = useMemo(() => trophies ? runDeepAudit(trophies) : null, [trophies]);

  if (!message && (!audit || (audit.isValid && audit.warnings.length === 0))) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <div className="bg-red-50 dark:bg-red-50 dark:bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex gap-3 items-start">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-700 dark:text-red-200">{message}</div>
        </div>
      )}

      {audit && audit.criticalErrors.map((err, i) => (
        <div key={`err-${i}`} className="bg-red-50 dark:bg-red-50 dark:bg-red-950/40 border border-red-500/50 rounded-xl p-4 flex gap-3 items-start animate-pulse">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-700 dark:text-red-200 font-medium">
            {err}
          </div>
        </div>
      ))}

      {audit && audit.warnings.map((warn, i) => (
        <div key={`warn-${i}`} className="bg-amber-50 dark:bg-amber-50 dark:bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-200 font-medium">
            {warn}
          </div>
        </div>
      ))}
    </div>
  );
};
