import React, { useRef } from "react";
import { Download, Upload, Trophy, Shield, HelpCircle } from "lucide-react";
import { PS3GameInfo, PresetGame } from "../types";
import { SAMPLE_PRESET_GAMES } from "../lib/trophyParser";
import { useLanguage } from "../context/LanguageContext";

interface HeaderProps {
  gameInfo: PS3GameInfo;
  onSelectPreset: (preset: PresetGame) => void;
  onUploadZip: (files: File[]) => void;
  onExportDat: () => void;
  onExportZip: () => void;
  onOpenJsonModal: () => void;
  onOpenPfdGuide: () => void;
  onOpenRandomizer: () => void;
  onOpenCalculator: () => void;
  onOpenParamSfo: () => void;
  onOpenVaultStats: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameInfo,
  onSelectPreset,
  onUploadZip,
  onExportDat,
  onExportZip,
  onOpenJsonModal,
  onOpenPfdGuide,
  onOpenRandomizer,
  onOpenCalculator,
  onOpenParamSfo,
  onOpenVaultStats,
  onOpenAbout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { language, setLanguage, t } = useLanguage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadZip(Array.from(e.target.files));
    }
  };

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo and Title */}
          <div className="flex items-center gap-3.5">
            {/* Custom Styled Trophy Vault Badge Icon */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-emerald-500/20 to-amber-500/30 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/80 p-0.5 flex items-center justify-center shadow-2xl">
                <div className="w-full h-full rounded-[14px] bg-zinc-950/90 flex items-center justify-center border border-amber-500/20">
                  <Trophy className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                </div>
              </div>
            </div>

            {/* App Branding Text */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans drop-shadow-sm">
                  Ares <span className="text-amber-400 font-extrabold">Trophy Vault</span>
                </span>
                
                {/* Version & Engine Badges */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-[10px] font-mono font-bold text-emerald-300 shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    v1.0
                  </span>

                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".sfm,.dat,.sfo,.png"
              multiple
              className="hidden"
            />
            {/* The webkitdirectory attribute allows folder selection in Chrome/Edge/Firefox */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFileChange}
              {...({ webkitdirectory: "", directory: "" } as any)}
              className="hidden"
            />

            {/* Upload Buttons Group */}
            <div className="flex items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium py-2 px-3 rounded-l-xl border border-zinc-700 border-r-0 transition-colors shadow-sm cursor-pointer"
                title="Upload ZIP, TROPUSR.DAT, or other files"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-300" />
                <span>Arquivo / ZIP</span>
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium py-2 px-3 rounded-r-xl border border-zinc-700 transition-colors shadow-sm cursor-pointer"
                title="Upload a full PS3 Trophy Folder"
              >
                <span>Pasta</span>
              </button>
            </div>

            {/* PARAM.SFO Editor */}
            <button
              onClick={onOpenParamSfo}
              className="inline-flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold py-2 px-3 rounded-xl border border-emerald-800/80 shadow-sm transition-colors cursor-pointer"
              title="Editor e Reassinador PARAM.SFO (Account ID)"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reassinar PARAM.SFO</span>
            </button>

            {/* About App Modal */}
            <button
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold py-2 px-3 rounded-xl border border-amber-900/50 hover:border-amber-600 transition-colors cursor-pointer"
              title="Sobre o Ares Trophy Vault"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Sobre</span>
            </button>

            {/* Export Menu */}
            <div className="flex items-center">
              <button
                onClick={onExportDat}
                className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs py-2 px-3 rounded-xl shadow-md transition-colors cursor-pointer"
                title="Download updated binary TROPUSR.DAT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("saveDat")}</span>
              </button>

            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

