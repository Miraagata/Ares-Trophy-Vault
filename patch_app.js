const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// We need to add the new base64 state
content = content.replace(
  /const \[originalBuffer, setOriginalBuffer\] = useState<ArrayBuffer \| undefined>\(\);/,
  `const [originalUsrDatBase64, setOriginalUsrDatBase64] = useState<string | undefined>();
  const [showDifficultyWarning, setShowDifficultyWarning] = useState(false);`
);

// We need to rewrite handleUploadFiles
const uploadOld = `  const handleUploadFiles = async (files: File[]) => {
    try {
      if (files.length === 0) return;
      const unpacked = await unpackTrophyFiles(files);
      setGameTitle(unpacked.gameInfo.title);
      setTitleId(unpacked.gameInfo.titleId);
      setAccountId(unpacked.gameInfo.accountId);
      setGroups(unpacked.gameInfo.groups);
      setTrophies(unpacked.trophies);
      setOriginalBuffer(unpacked.originalUsrDatBuffer);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to unpack uploaded trophy files:", err);
      alert("Erro ao processar os arquivos. Certifique-se de que selecionou os arquivos válidos de troféu do PS3 (.DAT, .SFO, .SFM, .PNG ou um .ZIP).");
    }
  };`;

const uploadNew = `  const handleUploadFiles = async (files: File[]) => {
    try {
      if (files.length === 0) return;
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      
      const response = await fetch("/api/upload-trophy-files", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      setGameTitle(data.profile.titleId); // Use titleId as title or implement fetch game name
      setTitleId(data.profile.titleId);
      setAccountId(data.profile.accountId);
      
      // Compute total trophies and groups manually since we bypassed client-side parser
      const parsedTrophies = data.trophies.map((t: any) => ({
        ...t,
        unlocked: t.isUnlocked,
        synced: t.isSynced,
        timestamp: t.timestamp ? new Date(t.timestamp) : undefined,
        iconDataUrl: t.base64Image,
        description: t.detail,
        groupId: "default",
        type: t.type
      }));
      setTrophies(parsedTrophies);
      setOriginalUsrDatBase64(data.originalUsrDat);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to upload files:", err);
      alert("Erro ao processar os arquivos. Certifique-se de que selecionou os arquivos corretos.");
    }
  };`;

content = content.replace(uploadOld, uploadNew);

// We need to replace handleExportDat
const exportOld = `  const handleExportDat = () => {
    if (!originalBuffer) {
      alert("Nenhum arquivo base original encontrado. Por favor, carregue um TROPUSR.DAT antes de exportar.");
      return;
    }
    const bytes = serializeTropUsrDat(trophies, originalBuffer);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TROPUSR.DAT";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };`;

const exportNew = `
  const performExport = async () => {
    if (!originalUsrDatBase64) {
      alert("Nenhum arquivo TROPUSR original encontrado.");
      return;
    }
    try {
      // Map back to the format the server expects
      const payloadTrophies = trophies.map(t => ({
        id: t.id,
        isUnlocked: t.unlocked,
        isSynced: t.synced,
        timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : null,
      }));

      const response = await fetch("/api/export-tropusr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tropUsrBase64: originalUsrDatBase64,
          trophies: payloadTrophies
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TROPUSR.DAT";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar o TROPUSR.DAT");
    }
  };

  const handleGlobalSave = () => {
    // Anti-Ban Logic
    const hardKeywords = ["hard", "difícil", "crushing", "insane", "professional", "veteran", "nightmare"];
    const easyKeywords = ["easy", "fácil", "normal", "casual", "beginner"];

    const unlocked = trophies.filter(t => t.unlocked && t.timestamp);
    const hards = unlocked.filter(t => hardKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw)));
    const easys = unlocked.filter(t => easyKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw)));

    let hasViolation = false;
    for (const h of hards) {
      for (const e of easys) {
        if (h.timestamp!.getTime() < e.timestamp!.getTime()) {
          hasViolation = true;
          break;
        }
      }
      if (hasViolation) break;
    }

    if (hasViolation) {
      setShowDifficultyWarning(true);
    } else {
      performExport();
    }
  };
`;

content = content.replace(exportOld, exportNew);

fs.writeFileSync('src/App.tsx', content);
