import React from "react";
import { PS3Trophy } from "../types";
import { ShieldAlert, AlertTriangle, Clock, Check, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface DifficultyWarningModalProps {
  isOpen: boolean;
  highDiffTrophies: PS3Trophy[];
  onConfirm: () => void;
  onCancel: () => void;
  actionTitle?: string;
}

export const DifficultyWarningModal: React.FC<DifficultyWarningModalProps> = ({
  isOpen,
  highDiffTrophies,
  onConfirm,
  onCancel,
  actionTitle,
}) => {
  const { language } = useLanguage();
  const isPt = language === "pt-BR";

  if (!isOpen || highDiffTrophies.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-100/80 dark:bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-amber-600/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white p-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 shadow-lg">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-amber-200 flex items-center gap-2">
              {isPt ? "Aviso: Troféu de Alta Dificuldade" : "Warning: High Difficulty Trophy"}
            </h2>
            <p className="text-xs text-amber-300/80 font-medium mt-0.5">
              {actionTitle || (isPt ? "Troféus de modo Díficil/Pesadelo/Crushing detectados" : "High difficulty mode trophies detected")}
            </p>
          </div>
        </div>

        {/* List of Detected High Difficulty Trophies */}
        <div className="bg-white/90 dark:bg-zinc-950/90 border border-zinc-300 dark:border-zinc-800 rounded-xl p-3 mb-4 space-y-2 max-h-40 overflow-y-auto">
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            {isPt ? "Troféu(s) de Dificuldade Elevada:" : "Detected Trophy/Trophies:"}
          </span>
          {highDiffTrophies.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs bg-zinc-200 dark:bg-zinc-900/80 p-2 rounded-lg border border-amber-900/40">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-amber-900 dark:text-amber-100 block truncate">{t.name}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 truncate block">{t.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Educational Rationale Box */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 rounded-xl p-3.5 mb-5 space-y-2 text-xs text-amber-900 dark:text-amber-100">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            {isPt ? "Por que pedir confirmação para troféus difíceis?" : "Why require confirmation for hard trophies?"}
          </div>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[11px]">
            {isPt 
              ? "Atenção: Você desbloqueou um troféu de dificuldade alta antes de um de dificuldade baixa. Embora existam exceções (como autopop de cross-save), isso é altamente suspeito em auditorias."
              : "Attention: You unlocked a high difficulty trophy before a lower difficulty one. Although exceptions exist (like cross-save autopop), this is highly suspicious in audits."}
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-700/40 text-[11px] font-semibold text-amber-200">
            {isPt
              ? "⚡ Sistema Anti-Ban: O botão 'Confirmar' salvará o arquivo de qualquer maneira, mas esteja ciente dos riscos acima."
              : "⚡ Anti-Ban System: The 'Confirm' button will save the file anyway, but be aware of the risks above."}
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-300 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 hover:text-black dark:text-white hover:bg-zinc-200 dark:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isPt ? "Cancelar" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-zinc-100 dark:text-zinc-950 shadow-lg transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isPt ? "Estou Ciente - Salvar Mesmo Assim" : "I Understand - Save Anyway"}
          </button>
        </div>

      </div>
    </div>
  );
};
