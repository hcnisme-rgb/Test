
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { toPng } from 'https://esm.sh/html-to-image@1.11.11';

// --- Types & Interfaces ---

type Role = 'teacher' | 'parent';
type Tier = 'Emerging' | 'Meeting' | 'Exceeding';

interface AssessmentSession {
  id: string;
  studentName: string;
  stage1Answers: Record<string, { selected: any, isCorrect: boolean, text?: string, tier?: Tier }>;
  stage2Answers: Record<string, any>;
  speakingScores: Record<string, Tier>;
  notes: string;
  photoUrl?: string;
  audioBlobUrl?: string;
  reportDraft: string;
  isSynced: boolean;
  timestamp: string;
}

interface PlacementResult extends AssessmentSession {
  totalScore: number;
  level: number;
  team: string;
}

// --- Configuration ---

const APP_CONFIG = {
  name: "World Explorers｜Try your best",
  teams: {
    1: { 
      name: "Happy Seed", 
      levelName: "Seed",
      mapping: "Pre-A1 Starters",
      color: "bg-amber-100 border-amber-500 text-amber-900", 
      icon: "🌱", 
      reason: "For curious beginners ready to sprout and build foundational confidence.",
      reasonCN: "适合准备开始探索、建立基础自信的初学者。",
      strengths: ["Shows curiosity in pointing tasks.", "Can identify high-frequency objects."],
      strengthsCN: ["在指认任务中表现出好奇心。", "能识别高频生活物品。"],
      nextSteps: ["Listen to simple English nursery rhymes at home.", "Practice pointing to and naming household items in English."],
      nextStepsCN: ["在家听简单的英文童谣。", "练习用英文指认并命名家里的物品。"]
    },
    2: { 
      name: "Growing Sprout", 
      levelName: "Sprout",
      mapping: "A1 Movers",
      color: "bg-emerald-100 border-emerald-500 text-emerald-900", 
      icon: "🌿", 
      reason: "For flexible thinkers ready to sway and grow into complete sentences.",
      reasonCN: "适合准备迎接挑战、尝试完整短句表达的灵活思考者。",
      strengths: ["Can recognize familiar sight words.", "Able to answer simple 'What' questions."],
      strengthsCN: ["能识别熟悉的常用词汇。", "能回答简单的 What 问题。"],
      nextSteps: ["Read picture books with 1-2 sentences per page.", "Practice asking 'What is this?' in daily routines."],
      nextStepsCN: ["阅读每页有1-2个句子的绘本。", "在日常生活中练习用 'What is this?' 进行提问。"]
    },
    3: { 
      name: "Blooming Flowers", 
      levelName: "Flower",
      mapping: "A2 Flyers",
      color: "bg-rose-100 border-rose-500 text-rose-900", 
      icon: "🌸", 
      reason: "For confident thinkers ready to explain their world with details.",
      reasonCN: "适合准备展现自我风采、能用细节描述世界的自信探索者。",
      strengths: ["Can construct simple complete sentences.", "Shows awareness of phonetic decoding."],
      strengthsCN: ["能构建简单的完整句子。", "表现出初步的自然拼读解码意识。"],
      nextSteps: ["Listen to short English stories and retell key parts.", "Encourage explaining 'Why' using simple because-phrases."],
      nextStepsCN: ["听英文短篇故事并复述关键部分。", "鼓励使用 simple because-phrases 解释 'Why'。"]
    }
  }
};

const SIGHT_WORDS = ["my", "is", "this", "and", "what", "buy", "which", "can", "that", "these"];
const COUNTRIES = ["Mexico", "Australia", "China", "India", "The UK"];
const L2_CVC_WORDS = ["cat", "dog", "sit", "kite", "sape", "rain"];

// --- Archival Utilities ---

const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

const saveReportAsImage = async (elementId: string, studentName: string) => {
  const node = document.getElementById(elementId);
  if (!node) return;
  
  try {
    const dataUrl = await toPng(node, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: {
        borderRadius: '0px' // Ensure clean edges for the long image
      }
    });
    
    const link = document.createElement('a');
    link.download = `Report_${studentName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error generating image:', error);
    alert('Failed to generate image. Please try again.');
  }
};

const exportToCSV = (results: PlacementResult[]) => {
  if (results.length === 0) return;
  const headers = ["ID", "Name", "Timestamp", "Level", "Team", "Score", "Notes"];
  const rows = results.map(r => [
    r.id,
    r.studentName,
    r.timestamp,
    r.level,
    r.team,
    r.totalScore,
    `"${r.notes.replace(/"/g, '""')}"`
  ]);
  const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  downloadFile(csvContent, `explorers_data_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;");
};

const exportToJSON = (results: PlacementResult[]) => {
  const jsonContent = JSON.stringify(results, null, 2);
  downloadFile(jsonContent, `explorers_full_backup_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
};

const saveOfflineReport = (result: PlacementResult) => {
  const team = APP_CONFIG.teams[result.level as 1|2|3];
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${result.studentName} - Report</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f9fafb; padding: 40px; }
        .report-card { background: white; border-radius: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); overflow: hidden; max-width: 800px; margin: 0 auto; border: 8px solid white; }
      </style>
    </head>
    <body>
      <div class="report-card">
        <div class="p-20 text-center ${team.color}">
          <div class="text-8xl mb-6">${team.icon}</div>
          <h2 class="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">World Explorers Report</h2>
          <h1 class="text-6xl font-black mb-2">${team.name}</h1>
          <p class="text-xl font-bold opacity-80">${result.studentName}</p>
        </div>
        <div class="p-16 space-y-10">
          <div class="bg-gray-50 p-10 rounded-[40px]">
            <h3 class="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">Teacher Summary</h3>
            <p class="text-lg font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">${result.reportDraft}</p>
          </div>
          ${result.photoUrl ? `<img src="${result.photoUrl}" class="w-full rounded-[30px] shadow-lg" />` : ''}
          <div class="text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em]">
            Archived on ${result.timestamp}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  downloadFile(html, `report_${result.studentName.toLowerCase().replace(/\s+/g, '_')}.html`, "text/html");
};

// --- Helper Functions ---

const generateBilingualReport = (session: AssessmentSession, result: PlacementResult) => {
  const team = APP_CONFIG.teams[result.level as 1|2|3];
  return `World Explorers Assessment Report 评估报告

Explorer: ${session.studentName}
Placement: ${team.name} (${team.levelName})
Mapping: ${team.mapping}

Reason for Grouping / 分组原因:
${team.reasonCN}
(${team.reason})

Strengths / 亮点:
1. ${team.strengthsCN[0]} (${team.strengths[0]})
2. ${team.strengthsCN[1]} (${team.strengths[1]})

Next Steps / 下一步建议:
1. ${team.nextStepsCN[0]} (${team.nextSteps[0]})
2. ${team.nextStepsCN[1]} (${team.nextSteps[1]})

Try your best! 尽力而為，享受探索！`;
};

const calculateResult = (session: AssessmentSession): PlacementResult => {
  let s1 = 0, s2 = 0, s3 = 0;
  Object.values(session.stage1Answers).forEach(a => { if (a.isCorrect) s1 += 5; });
  
  // Stage 2 Scoping
  if (session.stage2Answers['S2_L3_SightWords']) {
    s2 += Object.values(session.stage2Answers['S2_L3_SightWords']).filter(v => v === true).length;
  }
  
  Object.values(session.speakingScores).forEach(t => { 
    if (t === 'Exceeding') s3 += 12; else if (t === 'Meeting') s3 += 8; else s3 += 4; 
  });
  
  const total = s1 + s2 + s3;
  let level = 1;
  if (total >= 70) level = 3; else if (total >= 40) level = 2;
  
  const teamName = APP_CONFIG.teams[level as 1|2|3].name;
  const res = { ...session, totalScore: total, level, team: teamName };
  return { ...res, reportDraft: generateBilingualReport(session, res as PlacementResult) };
};

// --- Components ---

const ReportCardContent = ({ result }: { result: PlacementResult }) => {
  const team = APP_CONFIG.teams[result.level as 1|2|3];
  return (
    <div id={`report-capture-${result.id}`} className="bg-white rounded-[60px] shadow-2xl overflow-hidden border-8 border-white">
      <div className={`p-20 text-center ${team.color} border-b-8 border-white`}>
        <div className="text-9xl mb-8 drop-shadow-xl">{team.icon}</div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40 mb-6">World Explorers｜Report</h2>
        <h1 className="text-7xl font-black mb-4">{team.name}</h1>
        <p className="text-2xl font-bold opacity-80 mb-2">Level: {team.levelName}</p>
        <p className="text-sm font-black opacity-40 tracking-widest">{team.mapping}</p>
      </div>
      <div className="p-16 space-y-12">
        <div className="bg-gray-50/50 p-12 rounded-[50px] border-2 border-gray-100">
           <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-8 border-b-2 border-blue-50 pb-4">Report Summary 报告总结</h3>
           <p className="text-xl font-black text-gray-800 leading-relaxed whitespace-pre-wrap">{result.reportDraft}</p>
        </div>
        {result.photoUrl && (
          <div className="rounded-[40px] overflow-hidden border-4 border-white shadow-xl">
            <img src={result.photoUrl} className="w-full" alt="evidence" />
          </div>
        )}
        <div className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] pt-8">
            World Explorers｜Assessment Date: {result.timestamp}
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard = ({ results, onStartNew, onSetRole }: { results: PlacementResult[], onStartNew: () => void, onSetRole: (r: Role) => void }) => {
  const [selected, setSelected] = useState<PlacementResult | null>(null);

  const handleExportAll = () => {
    exportToJSON(results);
    exportToCSV(results);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Teacher Console</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">{APP_CONFIG.name}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleExportAll} className="bg-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
            <span>📦</span> EXPORT PACK
          </button>
          <button onClick={() => onSetRole('parent')} className="bg-white border-2 border-gray-100 text-gray-400 px-6 py-4 rounded-2xl font-black text-sm hover:bg-gray-50 transition-colors">PARENT PORTAL</button>
          <button onClick={onStartNew} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-black text-lg shadow-xl">+ NEW ASSESSMENT</button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-6">Explorer</th>
              <th className="px-10 py-6">Status</th>
              <th className="px-10 py-6">Placement</th>
              <th className="px-10 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {results.length === 0 ? (
              <tr><td colSpan={4} className="px-10 py-20 text-center text-gray-300 font-bold">No records found.</td></tr>
            ) : results.map(r => (
              <tr key={r.id} className="hover:bg-blue-50/20 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-10 py-8">
                  <div className="flex items-center gap-4">
                    {r.photoUrl && <img src={r.photoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />}
                    <span className="font-black text-gray-900 text-xl">{r.studentName}</span>
                  </div>
                </td>
                <td className="px-10 py-8 text-xs font-bold text-green-500 uppercase">Synced ✓</td>
                <td className="px-10 py-8">
                  <span className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest ${APP_CONFIG.teams[r.level as 1|2|3].color}`}>
                    {r.team.toUpperCase()}
                  </span>
                </td>
                <td className="px-10 py-8 text-right font-black text-blue-600 hover:underline">VIEW DATA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[60px] p-12 shadow-2xl animate-in relative my-auto">
            <button onClick={() => setSelected(null)} className="absolute top-10 right-10 text-gray-300 text-2xl font-black">✕</button>
            <h2 className="text-4xl font-black mb-10">{selected.studentName}'s Data</h2>
            
            <div className="grid grid-cols-2 gap-8 mb-12">
               <div>
                  <h3 className="text-xs font-black text-blue-500 uppercase mb-4 tracking-widest">Photo Evidence</h3>
                  {selected.photoUrl ? <img src={selected.photoUrl} className="w-full rounded-[40px] border-4 border-gray-100" /> : <div className="p-10 bg-gray-50 rounded-[40px] text-gray-300 text-center">No Photo</div>}
               </div>
               <div className="space-y-6">
                  <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Session Summary</h3>
                  <div className="p-6 bg-gray-50 rounded-[30px] border border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">Team Level</p>
                    <p className="text-2xl font-black">{selected.team}</p>
                    <p className="text-xs font-bold text-gray-400 mt-1">{APP_CONFIG.teams[selected.level as 1|2|3].mapping}</p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-[30px] border border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase mb-2">XP Score</p>
                    <p className="text-2xl font-black text-blue-600">{selected.totalScore} pts</p>
                  </div>
               </div>
            </div>

            <div className="space-y-8 mb-12">
              <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b pb-2">Final Report Card Preview</h3>
              <div className="transform scale-90 origin-top">
                <ReportCardContent result={selected} />
              </div>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => saveReportAsImage(`report-capture-${selected.id}`, selected.studentName)} 
                className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] text-xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
              >
                <span>📸</span> SAVE AS IMAGE (HIGH-RES)
              </button>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex-1 bg-gray-900 text-white font-black py-6 rounded-3xl">SAVE AS PDF</button>
                <button onClick={() => saveOfflineReport(selected)} className="flex-1 bg-blue-50 text-blue-600 font-black py-6 rounded-3xl border border-blue-100">OFFLINE HTML</button>
              </div>
              <button onClick={() => setSelected(null)} className="w-full bg-gray-100 text-gray-500 font-black py-4 rounded-2xl">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AssessmentFlow = ({ onComplete, onCancel }: { onComplete: (res: PlacementResult) => void, onCancel: () => void }) => {
  const [step, setStep] = useState<'intro' | 'photo' | 's1' | 's2' | 's3' | 'report'>('intro');
  const [studentName, setStudentName] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [session, setSession] = useState<AssessmentSession>({
    id: Math.random().toString(36).substr(2, 9),
    studentName: '',
    stage1Answers: {},
    stage2Answers: {},
    speakingScores: {},
    notes: '',
    isSynced: false,
    reportDraft: '',
    timestamp: new Date().toLocaleDateString()
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) { alert("Camera access denied."); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const data = canvasRef.current.toDataURL('image/png');
      setSession(prev => ({ ...prev, photoUrl: data }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSession(p => ({ ...p, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setSession(prev => ({ ...prev, audioBlobUrl: url }));
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (e) { alert("Microphone access denied."); }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleBack = () => {
    if (step === 'photo') setStep('intro');
    else if (step === 's1') {
      if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
      else setStep('photo');
    }
    else if (step === 's2') {
      if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
      else { setStep('s1'); setCurrentIdx(5); }
    }
    else if (step === 's3') setStep('s2');
    else if (step === 'report') setStep('s3');
  };

  const NavHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-center mb-10">
      <button onClick={handleBack} className="text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-blue-500 flex items-center gap-2">
        <span className="text-xl">←</span> Back / 上一頁
      </button>
      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{title}</span>
    </div>
  );

  if (step === 'intro') {
    return (
      <div className="max-w-xl mx-auto bg-white p-16 rounded-[48px] shadow-2xl animate-in mt-10 text-center border-b-[12px] border-blue-600">
        <h2 className="text-3xl font-black text-gray-900 mb-8">New Explorer</h2>
        <input autoFocus className="w-full bg-gray-50 border-4 border-gray-100 rounded-3xl px-8 py-6 text-center text-3xl font-black focus:border-blue-500 outline-none uppercase" placeholder="NAME" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
        <div className="mt-10 p-8 bg-blue-50 rounded-[32px] text-left space-y-4">
           <p className="text-xs font-black text-blue-500 uppercase tracking-widest">Teacher Orientation Prompt / 提示語</p>
           <p className="text-sm font-medium text-gray-700 leading-relaxed">"如果不會可以說我不知道～這個遊戲是讓老師更好的幫助你英文變進步，接下來我會用英文跟你做對話，如果聽不懂你可以說這些詞或者你不會說的話可以指圖給我看。"</p>
           <p className="text-xs font-bold text-gray-400 italic">"It’s okay to say 'I don’t know'. This is to help me learn how to support you best."</p>
        </div>
        <button onClick={() => { setSession(prev => ({ ...prev, studentName })); setStep('photo'); }} className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl mt-10 shadow-xl text-xl">START ASSESSMENT</button>
        <button onClick={onCancel} className="mt-6 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Exit</button>
      </div>
    );
  }

  if (step === 'photo') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-12 rounded-[60px] shadow-2xl animate-in mt-10 space-y-8">
        <NavHeader title="Evidence Collection" />
        <h2 className="text-3xl font-black text-center">Explorer Evidence</h2>
        <div className="aspect-video bg-gray-100 rounded-[40px] overflow-hidden border-4 border-gray-50 flex items-center justify-center relative">
          {session.photoUrl ? (
            <img src={session.photoUrl} className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}
          {!session.photoUrl && (
             <button onClick={startCamera} className="absolute inset-0 m-auto w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl">📷</button>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex gap-4">
            {session.photoUrl ? (
              <button onClick={() => setSession(p => ({...p, photoUrl: undefined}))} className="flex-1 bg-gray-200 text-gray-600 font-black py-6 rounded-3xl">RETAKE</button>
            ) : (
              <button onClick={capturePhoto} className="flex-1 bg-gray-900 text-white font-black py-6 rounded-3xl">CAPTURE PHOTO</button>
            )}
            <label className="flex-1 bg-gray-900 text-white font-black py-6 rounded-3xl text-center cursor-pointer">
               UPLOAD PHOTO
               <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {session.photoUrl && (
            <button onClick={() => {
              const link = document.createElement('a');
              link.href = session.photoUrl!;
              link.download = `explorer_${session.studentName}.png`;
              link.click();
            }} className="w-full bg-gray-100 text-gray-500 font-black py-4 rounded-2xl">DOWNLOAD CURRENT PHOTO</button>
          )}
        </div>
        <button onClick={() => setStep('s1')} className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl shadow-xl">CONTINUE TO DISCOVERY</button>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (step === 's1') {
    const STAGE1_QUESTIONS = [
      { id: "S1_D1_Panda", prompt: "Point to the panda. 🐼", instruction: "Observe listening & pointing", type: "point" },
      { id: "S1_D1_Fan", prompt: "Point to the fan. 🪭", instruction: "Observe listening & pointing", type: "point" },
      { id: "S1_D1_SpellFan", prompt: "How do you spell 'fan'?", instruction: "Observe attempt", type: "point" },
      { id: "S1_D1_SpellPanda", prompt: "How do you spell 'panda'?", instruction: "Observe attempt", type: "point" },
      { id: "S1_D4", prompt: "Observation Field", instruction: "Record (e.g. Can read CVC, can decode a word)", type: "open" },
      { id: "S1_D5", prompt: "Other Behavior", instruction: "Extra observations", type: "open" }
    ];
    const q = STAGE1_QUESTIONS[currentIdx];
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in h-[85vh] flex flex-col">
        <div className="flex-grow bg-gray-900 text-white p-12 rounded-[60px] shadow-2xl flex flex-col">
          <NavHeader title={`Discovery Phase (${currentIdx+1}/6)`} />
          <div className="flex-grow flex flex-col justify-center text-center">
             <h3 className="text-5xl font-black leading-tight mb-4">{q.prompt}</h3>
             <p className="text-gray-400 italic">{q.instruction}</p>
          </div>
          <div className="space-y-6 mt-10">
            {q.type === 'point' ? (
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setSession(p => ({...p, stage1Answers: {...p.stage1Answers, [q.id]: { selected: 'fail', isCorrect: false }}})); if(currentIdx < 5) setCurrentIdx(currentIdx+1); else { setCurrentIdx(0); setStep('s2'); } }} className="py-14 rounded-[40px] border-4 border-red-900 text-red-500 font-black text-2xl hover:bg-red-900/10">NOT POINTED</button>
                <button onClick={() => { setSession(p => ({...p, stage1Answers: {...p.stage1Answers, [q.id]: { selected: 'pass', isCorrect: true }}})); if(currentIdx < 5) setCurrentIdx(currentIdx+1); else { setCurrentIdx(0); setStep('s2'); } }} className="py-14 rounded-[40px] border-4 border-green-900 text-green-500 font-black text-2xl hover:bg-green-900/10">POINTED ✓</button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea className="w-full h-32 bg-gray-800 rounded-3xl p-6 text-white border-2 border-gray-700 outline-none" placeholder="Notes..." value={session.stage1Answers[q.id]?.text || ''} onChange={(e) => setSession(p => ({...p, stage1Answers: {...p.stage1Answers, [q.id]: { ...p.stage1Answers[q.id], text: e.target.value, isCorrect: true }}}))} />
                <div className="grid grid-cols-3 gap-3">
                  {(['Emerging', 'Meeting', 'Exceeding'] as Tier[]).map(t => (
                    <button key={t} onClick={() => { setSession(p => ({...p, stage1Answers: {...p.stage1Answers, [q.id]: { ...p.stage1Answers[q.id], tier: t }}})); if(currentIdx < 5) setCurrentIdx(currentIdx+1); else { setCurrentIdx(0); setStep('s2'); } }} className={`py-6 rounded-2xl font-black text-[10px] uppercase border-2 ${session.stage1Answers[q.id]?.tier === t ? 'bg-blue-600 border-blue-600' : 'border-gray-700 text-gray-500'}`}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 's2') {
    const STAGE2_QUESTIONS = [
      { id: "S2_L1", prompt: "Literacy 1: Listen and point to S, D, P, W", type: "point_scale" },
      { id: "S2_L2", prompt: "Listen & Spell CVC: cat, dog, sit, kite, sape, rain", type: "cvc_list" },
      { id: "S2_L3_SightWords", prompt: "Sight Words Recognition (指讀)", type: "sight_words" },
      { id: "S2_L4_ReadingAwareness", prompt: "Reading & Meaning (Countries)", type: "reading_aware" },
      { id: "S2_L5", prompt: "Write name & sentence", type: "writing_tier" }
    ];
    const q = STAGE2_QUESTIONS[currentIdx];
    return (
      <div className="max-w-5xl mx-auto p-6 h-[85vh] flex flex-col">
        <div className="flex-grow bg-gray-900 text-white p-12 rounded-[60px] shadow-2xl flex flex-col">
          <NavHeader title={`Literacy Phase (${currentIdx+1}/5)`} />
          <h3 className="text-4xl font-black text-center mb-8">{q.prompt}</h3>
          
          <div className="flex-grow flex flex-col justify-center">
            {q.type === 'point_scale' && (
              <div className="space-y-8 max-w-xl mx-auto w-full">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...p.stage2Answers[q.id], scale: 'help' }}}))} className={`py-12 rounded-[40px] border-4 text-xl font-black uppercase ${session.stage2Answers[q.id]?.scale === 'help' ? 'bg-amber-600 border-amber-600' : 'border-gray-800 text-gray-500'}`}>Some need help</button>
                  <button onClick={() => setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...p.stage2Answers[q.id], scale: 'ok' }}}))} className={`py-12 rounded-[40px] border-4 text-xl font-black uppercase ${session.stage2Answers[q.id]?.scale === 'ok' ? 'bg-green-600 border-green-600' : 'border-gray-800 text-gray-500'}`}>Meeting OK</button>
                </div>
                <textarea className="w-full h-32 bg-gray-800 rounded-3xl p-6 text-white border-2 border-gray-700 outline-none" placeholder="L1 Notes..." value={session.stage2Answers[q.id]?.note || ''} onChange={(e) => setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...p.stage2Answers[q.id], note: e.target.value }}}))} />
                <button onClick={() => setCurrentIdx(currentIdx+1)} className="w-full bg-blue-600 py-6 rounded-3xl font-black text-xl">CONTINUE</button>
              </div>
            )}

            {q.type === 'cvc_list' && (
              <div className="space-y-6 max-w-xl mx-auto w-full">
                <div className="grid grid-cols-2 gap-4">
                  {L2_CVC_WORDS.map(word => (
                    <div key={word} className="flex items-center gap-3 bg-gray-800 p-6 rounded-3xl border border-gray-700">
                      <span className="flex-1 text-2xl font-black uppercase">{word}</span>
                      <button onClick={() => {
                        const cur = session.stage2Answers[q.id] || {};
                        setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...cur, [word]: !cur[word] }}}));
                      }} className={`w-12 h-12 rounded-full border-4 ${session.stage2Answers[q.id]?.[word] ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>✓</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setCurrentIdx(currentIdx+1)} className="w-full bg-white text-gray-900 py-6 rounded-3xl font-black text-xl">CONTINUE</button>
              </div>
            )}

            {q.type === 'sight_words' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {SIGHT_WORDS.map(word => (
                    <button key={word} onClick={() => {
                      const cur = session.stage2Answers[q.id] || {};
                      setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...cur, [word]: !cur[word] }}}));
                    }} className={`py-6 rounded-2xl border-2 font-black text-lg ${session.stage2Answers[q.id]?.[word] ? 'bg-blue-600 border-blue-600' : 'border-gray-800 text-gray-600'}`}>{word}</button>
                  ))}
                </div>
                <button onClick={() => setCurrentIdx(currentIdx+1)} className="w-full bg-white text-gray-900 py-6 rounded-3xl font-black text-xl mt-10">CONTINUE</button>
              </div>
            )}

            {q.type === 'reading_aware' && (
              <div className="space-y-4">
                {COUNTRIES.map(c => (
                  <div key={c} className="bg-gray-800 p-4 rounded-3xl border border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="text-xl font-black w-32">{c}</span>
                    <div className="flex flex-wrap gap-2">
                      {["Read Aloud", "Decoding", "Meaning", "Match"].map(dim => (
                        <button key={dim} onClick={() => {
                          const cur = session.stage2Answers[q.id] || {};
                          const countryData = cur[c] || [];
                          const newData = countryData.includes(dim) ? countryData.filter(d => d !== dim) : [...countryData, dim];
                          setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { ...cur, [c]: newData }}}));
                        }} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border-2 ${session.stage2Answers[q.id]?.[c]?.includes(dim) ? 'bg-blue-500 border-blue-500' : 'border-gray-600 text-gray-500'}`}>{dim}</button>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => setCurrentIdx(currentIdx+1)} className="w-full bg-white text-gray-900 py-6 rounded-3xl font-black text-xl mt-6">CONTINUE</button>
              </div>
            )}

            {q.type === 'writing_tier' && (
              <div className="grid grid-cols-3 gap-3">
                {(['Emerging', 'Meeting', 'Exceeding'] as Tier[]).map(t => (
                  <button key={t} onClick={() => { setSession(p => ({...p, stage2Answers: {...p.stage2Answers, [q.id]: { tier: t, isCorrect: true }}})); setStep('s3'); }} className={`py-12 rounded-[40px] border-4 text-xl font-black uppercase ${session.stage2Answers[q.id]?.tier === t ? 'bg-blue-600 border-blue-600' : 'border-gray-800 text-gray-600'}`}>{t}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 's3') {
    const SPEAKING_TASKS = [
      { id: "spk_1", prompt: "How are you?" },
      { id: "spk_2", prompt: "What is this / that?" },
      { id: "spk_3", prompt: "What do you like to do?" },
      { id: "spk_5", prompt: "Why do you like it?" }
    ];
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-8 min-h-[85vh]">
        <div className="flex-1 bg-gray-900 text-white p-12 rounded-[60px] shadow-2xl flex flex-col">
          <NavHeader title="Speaking & Recording" />
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black">WH-Questions</h2>
            <div className="flex gap-4">
               {session.audioBlobUrl && (
                  <button onClick={() => {
                    const link = document.createElement('a');
                    link.href = session.audioBlobUrl!;
                    link.download = `explorer_${session.studentName}_audio.webm`;
                    link.click();
                  }} className="bg-green-600 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase">DOWNLOAD AUDIO</button>
               )}
               <button onClick={isRecording ? stopAudioRecording : startAudioRecording} className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase transition-all ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                 <span className="w-2 h-2 bg-red-500 rounded-full"></span> {isRecording ? 'STOP' : 'START RECORD'}
               </button>
            </div>
          </div>
          <div className="space-y-4 flex-grow overflow-y-auto pr-4 scrollbar-hide">
            {SPEAKING_TASKS.map(task => (
              <div key={task.id} className="bg-gray-800/50 p-6 rounded-[40px] border border-gray-800">
                <p className="text-lg font-bold text-gray-200 mb-6">{task.prompt}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Emerging', 'Meeting', 'Exceeding'] as Tier[]).map(t => (
                    <button key={t} onClick={() => setSession(p => ({...p, speakingScores: {...p.speakingScores, [task.id]: t}}))} className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${session.speakingScores[task.id] === t ? 'bg-blue-600 border-blue-600 shadow-lg' : 'border-gray-700 text-gray-600'}`}>
                      {t}<br/>
                      <span className="text-[8px] opacity-40 lowercase block mt-1">{t === 'Emerging' ? 'Words' : t === 'Meeting' ? 'Sentences' : 'Fluent'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { setSession(prev => ({ ...prev, reportDraft: generateBilingualReport(prev, calculateResult(prev)) })); setStep('report'); }} className="w-full bg-blue-600 text-white font-black py-8 rounded-[40px] mt-10 shadow-2xl text-2xl">DRAFT REPORT</button>
        </div>
        <div className="flex-1 bg-white p-12 rounded-[60px] shadow-xl border-4 border-gray-50 flex flex-col">
           <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6">Final Observations</h3>
           <textarea className="w-full flex-grow bg-gray-50 rounded-[40px] p-8 text-lg font-medium outline-none border-2 border-gray-100 focus:bg-white focus:border-blue-400 transition-all resize-none" placeholder="General observation notes..." value={session.notes} onChange={(e) => setSession({...session, notes: e.target.value})} />
        </div>
      </div>
    );
  }

  if (step === 'report') {
    return (
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-[60px] shadow-2xl animate-in mt-10 space-y-10">
        <NavHeader title="Final Review" />
        <div className="flex justify-between items-end">
          <h2 className="text-3xl font-black">Teacher Review</h2>
          <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Bilingual Template</span>
        </div>
        <textarea className="w-full h-[500px] bg-gray-50 border-4 border-gray-100 rounded-[40px] p-10 text-lg font-medium text-gray-700 outline-none focus:bg-white focus:border-blue-400 transition-all leading-relaxed" value={session.reportDraft} onChange={(e) => setSession(p => ({...p, reportDraft: e.target.value}))} />
        <button onClick={() => onComplete(calculateResult(session))} className="w-full bg-blue-600 text-white font-black py-8 rounded-[40px] shadow-2xl text-2xl">SUBMIT & SYNC</button>
      </div>
    );
  }

  return null;
};

const ParentPortal = ({ results, onSetRole }: { results: PlacementResult[], onSetRole: (r: Role) => void }) => {
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<PlacementResult | null>(null);

  if (found) {
    return (
      <div className="max-w-4xl mx-auto animate-in mt-10 mb-20 space-y-8">
        {/* Isolated content for image capture */}
        <ReportCardContent result={found} />
        
        {/* External controls */}
        <div className="bg-white p-12 rounded-[50px] shadow-xl border-4 border-gray-50 space-y-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">Export & Archive / 導出存檔</h3>
          <button 
            onClick={() => saveReportAsImage(`report-capture-${found.id}`, found.studentName)} 
            className="w-full bg-blue-600 text-white font-black py-8 rounded-[40px] text-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4"
          >
            <span>📸</span> SAVE AS IMAGE (RECOMMENDED)
          </button>
          
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => window.print()} className="bg-gray-900 text-white font-black py-7 rounded-[32px] text-xl hover:bg-black transition-all">SAVE AS PDF</button>
            <button onClick={() => saveOfflineReport(found)} className="bg-blue-50 text-blue-600 font-black py-7 rounded-[32px] text-xl border-4 border-blue-100 hover:bg-blue-100 transition-all">OFFLINE HTML</button>
          </div>
          <button onClick={() => setFound(null)} className="w-full py-6 text-gray-300 font-black border-4 border-gray-50 rounded-[32px] uppercase text-[10px] tracking-widest">Back / 返回</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-16 rounded-[60px] shadow-2xl text-center animate-in mt-10">
      <div className="w-32 h-32 bg-blue-50 rounded-[48px] flex items-center justify-center mx-auto mb-12 text-7xl">🔭</div>
      <h2 className="text-4xl font-black mb-6">Parent Portal</h2>
      <p className="text-gray-400 font-medium mb-12">Enter Explorer's name to see report.</p>
      <input className="w-full border-4 border-gray-100 bg-gray-50 rounded-[32px] px-8 py-7 text-center text-3xl font-black focus:border-blue-400 outline-none uppercase" placeholder="NAME" value={search} onChange={(e) => setSearch(e.target.value)} />
      <button onClick={() => setFound(results.find(r => r.studentName.toLowerCase() === search.toLowerCase() && r.isSynced) || null)} className="w-full bg-blue-600 text-white font-black py-7 rounded-[32px] mt-8 shadow-xl text-xl hover:bg-blue-700 transition-all">VIEW REPORT</button>
      <button onClick={() => onSetRole('teacher')} className="mt-10 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-blue-500">Teacher Login</button>
    </div>
  );
};

const App = () => {
  const [role, setRole] = useState<Role>('teacher');
  const [results, setResults] = useState<PlacementResult[]>(() => {
    try {
      const saved = localStorage.getItem('camp_v124_final');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isAssessing, setIsAssessing] = useState(false);

  useEffect(() => {
    localStorage.setItem('camp_v124_final', JSON.stringify(results));
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 pb-40">
      <header className="pt-20 pb-16 px-8 text-center max-w-xl mx-auto">
        <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.6em] mb-4">Placement Engine v1.24</div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter leading-none uppercase">{APP_CONFIG.name}</h2>
      </header>

      <main className="px-4">
        {role === 'teacher' && (
          isAssessing 
            ? <AssessmentFlow onCancel={() => setIsAssessing(false)} onComplete={(res) => { setResults(p => [...p, { ...res, isSynced: true }]); setIsAssessing(false); }} />
            : <TeacherDashboard results={results} onStartNew={() => setIsAssessing(true)} onSetRole={setRole} />
        )}
        {role === 'parent' && <ParentPortal results={results} onSetRole={setRole} />}
      </main>

      <footer className="text-center text-gray-300 text-[10px] font-black uppercase tracking-[0.8em] mt-24 mb-32">
        World Explorers｜Try Your Best
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const rootKey = '_reactRoot';
  if (!(container as any)[rootKey]) {
    (container as any)[rootKey] = createRoot(container);
  }
  (container as any)[rootKey].render(<App />);
}
