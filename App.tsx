
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon, 
  ClipboardDocumentCheckIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { 
  MeetingPurpose, 
  MeetingResult, 
  Frequency, 
  Participant, 
  HistoryItem 
} from './types';
import { 
  ROLE_PRESETS, 
  FREQUENCY_FACTORS, 
  SCORE_LOGIC 
} from './constants';
import { 
  formatCurrency, 
  copyToClipboard, 
  downloadCSV 
} from './utils';

const App: React.FC = () => {
  // --- State ---
  const [meetingName, setMeetingName] = useState<string>('定例MTG');
  const [duration, setDuration] = useState<number | string>(60);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.WEEKLY);
  const [purpose, setPurpose] = useState<MeetingPurpose>(MeetingPurpose.SHARE);
  const [result, setResult] = useState<MeetingResult>(MeetingResult.SHARED_ONLY);
  const [reductionMins, setReductionMins] = useState<number | string>(15);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', ...ROLE_PRESETS[2], count: 1 },
    { id: '2', ...ROLE_PRESETS[3], count: 3 },
  ]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('meeting_cost_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("History parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('meeting_cost_history', JSON.stringify(history));
  }, [history]);

  // --- Validation Logic ---
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!meetingName) newErrors.meetingName = "会議名を入力してください";
    if (Number(duration) <= 0) newErrors.duration = "時間は1分以上で入力してください";
    
    participants.forEach((p, idx) => {
      if (p.hourlyRate < 0) newErrors[`rate_${p.id}`] = "時給は0以上";
      if (p.count < 0) newErrors[`count_${p.id}`] = "人数は0以上";
      if (!p.role) newErrors[`role_${p.id}`] = "役職を入力";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Calculations ---
  const { oneTimeCost, monthlyCost, annualCost, totalParticipantsCount, isValid } = useMemo(() => {
    const hourlyCostTotal = participants.reduce((sum, p) => sum + (p.hourlyRate * p.count), 0);
    const d = Number(duration);
    const oneTime = (hourlyCostTotal * d) / 60;
    const factor = FREQUENCY_FACTORS[frequency];
    const monthly = oneTime * factor;
    const annual = monthly * 12;
    const count = participants.reduce((sum, p) => sum + p.count, 0);
    
    const valid = !isNaN(oneTime) && d > 0 && participants.every(p => p.count >= 0 && p.hourlyRate >= 0);

    return { 
      oneTimeCost: valid ? oneTime : 0, 
      monthlyCost: valid ? monthly : 0, 
      annualCost: valid ? annual : 0,
      totalParticipantsCount: count,
      isValid: valid
    };
  }, [participants, duration, frequency]);

  const { score, advice } = useMemo(() => {
    const data = SCORE_LOGIC[purpose][result];
    return data || { score: 0, advice: "品質を評価するには項目を選択してください。" };
  }, [purpose, result]);

  const savings = useMemo(() => {
    const hourlyCostTotal = participants.reduce((sum, p) => sum + (p.hourlyRate * p.count), 0);
    const r = Number(reductionMins);
    const monthlySavings = (hourlyCostTotal * r / 60) * FREQUENCY_FACTORS[frequency];
    return {
      monthly: monthlySavings,
      annual: monthlySavings * 12
    };
  }, [participants, reductionMins, frequency]);

  // --- Handlers ---
  const addParticipant = (presetIndex?: number) => {
    const preset = presetIndex !== undefined ? ROLE_PRESETS[presetIndex] : { role: '', hourlyRate: 0 };
    setParticipants([...participants, { id: Math.random().toString(36).substr(2, 9), ...preset, count: 1 }]);
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter(p => p.id !== id));
  };

  const saveToHistory = () => {
    if (!validate()) return;
    
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      name: meetingName,
      duration: Number(duration),
      frequency,
      purpose,
      result,
      participants: [...participants],
      oneTimeCost,
      monthlyCost,
      annualCost,
      score
    };
    const newHistory = [newItem, ...history].slice(0, 20);
    setHistory(newHistory);
    showFeedback('履歴に保存しました');
  };

  const restoreHistory = (item: HistoryItem) => {
    setMeetingName(item.name);
    setDuration(item.duration);
    setFrequency(item.frequency);
    setPurpose(item.purpose);
    setResult(item.result);
    setParticipants(item.participants);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (confirm('履歴と現在の入力をすべてリセットしますか？')) {
      setHistory([]);
      setParticipants([{ id: '1', ...ROLE_PRESETS[2], count: 1 }]);
      setMeetingName('定例MTG');
      setDuration(60);
      setErrors({});
    }
  };

  const handleCopySummary = async () => {
    const text = `【会議コスト診断結果】
会議名: ${meetingName}
時間: ${duration}分 (${frequency})
参加人数: ${totalParticipantsCount}名
1回のコスト: ${isValid ? formatCurrency(oneTimeCost) : '-'}
月間コスト: ${isValid ? formatCurrency(monthlyCost) : '-'}
年間コスト: ${isValid ? formatCurrency(annualCost) : '-'}
会議品質スコア: ${score}/100
一言改善: ${advice}`;
    const ok = await copyToClipboard(text);
    if (ok) showFeedback('結果をクリップボードにコピーしました');
  };

  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleExportCSV = () => {
    if (history.length === 0) {
      alert("エクスポートする履歴がありません");
      return;
    }
    const headers = ["日時", "会議名", "時間(分)", "頻度", "目的", "成果", "1回コスト", "月間コスト", "年間コスト", "スコア"];
    const rows = history.map(h => [
      new Date(h.timestamp).toLocaleString(),
      `"${h.name}"`,
      h.duration.toString(),
      h.frequency,
      h.purpose,
      h.result,
      h.oneTimeCost.toFixed(0),
      h.monthlyCost.toFixed(0),
      h.annualCost.toFixed(0),
      h.score.toString()
    ]);
    downloadCSV(headers, rows, `meeting_cost_history_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // --- Templates ---
  const generateTemplate = (type: 'agenda' | 'next' | 'minutes') => {
    let text = "";
    if (type === 'agenda') {
      text = `【議題テンプレート】
会議名: ${meetingName}
目的: ${purpose}
議題: 
1. 
2. 
決めたいこと: ${result === MeetingResult.DECIDED ? '決定済み事項の最終確認' : '本会議のゴール'}
前提資料: 
持ち帰り事項: `;
    } else if (type === 'next') {
      text = `【次回アジェンダ案】
前回の成果: ${result}
参加人数: ${totalParticipantsCount}名
1. 前回の振り返りとToDo進捗 (10分)
2. メイン議題: ${purpose}に関連する議論 (25分)
3. ${meetingName}の運用改善案 (10分)
4. ネクストアクションの定義 (5分)`;
    } else {
      text = `【議事録フォーマット】
会議名: ${meetingName}
日時: ${new Date().toLocaleDateString()}
参加者: ${totalParticipantsCount}名
決定事項: 
- 
ToDo / 期限 / 担当:
- 
補足事項: `;
    }
    copyToClipboard(text);
    showFeedback('テンプレートをコピーしました');
  };

  // --- Components ---
  // Fix: children must be optional to avoid "missing children" TS error when used with text content
  const Label = ({ children, error }: { children?: React.ReactNode, error?: string }) => (
    <div className="flex justify-between items-center mb-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {children}
      </label>
      {error && <span className="text-[10px] text-red-500 font-bold">{error}</span>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 pb-32">
      {/* Header */}
      <header className="mb-10 text-center animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 flex items-center justify-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <ChartBarIcon className="w-8 h-8 text-white" />
          </div>
          会議コスト可視化ツール
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          役職ごとの時給から会議コストを瞬時に計算。
          ムダな定例会を削減し、組織の生産性を最大化するためのSaaS風ダッシュボード。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Basic Info */}
          <section className="glass-card p-6 rounded-3xl shadow-xl shadow-slate-200/50 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <ClockIcon className="w-5 h-5 text-indigo-500" /> 会議基本設定
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2">
                <Label error={errors.meetingName}>会議名</Label>
                <input 
                  type="text" 
                  value={meetingName} 
                  onChange={(e) => setMeetingName(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border ${errors.meetingName ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all text-lg font-medium`}
                  placeholder="例: 部門定例ミーティング"
                />
              </div>
              <div>
                <Label error={errors.duration}>会議時間 (分)</Label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border ${errors.duration ? 'border-red-300' : 'border-slate-200'} rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all`}
                  min="0"
                />
              </div>
              <div>
                <Label>開催頻度</Label>
                <select 
                  value={frequency} 
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                >
                  {Object.values(Frequency).map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <Label>短縮目標 (分)</Label>
                <input 
                  type="number" 
                  value={reductionMins} 
                  onChange={(e) => setReductionMins(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-100 focus:outline-none transition-all text-green-700 font-bold"
                  min="0"
                />
                <p className="text-[10px] text-slate-400 mt-1">削減シミュレーション用</p>
              </div>
            </div>
          </section>

          {/* Section 2: Participants */}
          <section className="glass-card p-6 rounded-3xl shadow-xl shadow-slate-200/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-indigo-500" /> 参加者内訳
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto no-scrollbar">
                {ROLE_PRESETS.map((p, idx) => (
                  <button 
                    key={p.role} 
                    onClick={() => addParticipant(idx)}
                    className="text-[10px] px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap font-bold"
                  >
                    + {p.role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {participants.map(p => (
                <div key={p.id} className="group relative flex flex-wrap md:flex-nowrap gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all">
                  <div className="flex-1 min-w-[140px]">
                    <Label error={errors[`role_${p.id}`]}>役職</Label>
                    <input 
                      type="text" 
                      value={p.role} 
                      onChange={(e) => updateParticipant(p.id, { role: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      placeholder="例: マネージャ"
                    />
                  </div>
                  <div className="w-full sm:w-28">
                    <Label error={errors[`rate_${p.id}`]}>時給 (円)</Label>
                    <input 
                      type="number" 
                      value={p.hourlyRate} 
                      onChange={(e) => updateParticipant(p.id, { hourlyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      min="0"
                    />
                  </div>
                  <div className="w-full sm:w-20">
                    <Label error={errors[`count_${p.id}`]}>人数</Label>
                    <input 
                      type="number" 
                      value={p.count} 
                      onChange={(e) => updateParticipant(p.id, { count: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                      min="0"
                    />
                  </div>
                  <button 
                    onClick={() => removeParticipant(p.id)}
                    disabled={participants.length <= 1}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:text-slate-300"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => addParticipant()}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-bold"
              >
                <PlusIcon className="w-5 h-5" /> 自由な参加枠を追加
              </button>
            </div>
          </section>

          {/* Section 3: Quality */}
          <section className="glass-card p-6 rounded-3xl shadow-xl shadow-slate-200/50 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              品質評価・ROI分析
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>会議の目的</Label>
                <select 
                  value={purpose} 
                  onChange={(e) => setPurpose(e.target.value as MeetingPurpose)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                >
                  {Object.values(MeetingPurpose).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>得られた成果</Label>
                <select 
                  value={result} 
                  onChange={(e) => setResult(e.target.value as MeetingResult)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
                >
                  {Object.values(MeetingResult).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Results & History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Results Card */}
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 relative overflow-hidden sticky top-8">
            {/* Animated Gradient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full -mr-32 -mt-32 blur-3xl opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full -ml-32 -mb-32 blur-3xl opacity-20"></div>
            
            <div className="relative z-10 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Estimated Cost (1x)</p>
                  {isValid ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded-full">
                      <CheckCircleIcon className="w-3 h-3" /> Validated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded-full">
                      <ExclamationCircleIcon className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>
                <h3 className="text-5xl font-black tracking-tighter tabular-nums">
                  {isValid ? formatCurrency(oneTimeCost) : '---'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Monthly</p>
                  <p className="text-xl font-bold tabular-nums">{isValid ? formatCurrency(monthlyCost) : '---'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Annual</p>
                  <p className="text-xl font-bold tabular-nums">{isValid ? formatCurrency(annualCost) : '---'}</p>
                </div>
              </div>

              {/* Quality Score Display */}
              <div className="flex items-center gap-5 bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/20 shadow-inner">
                <div className="relative">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle 
                      cx="40" cy="40" r="36" 
                      stroke="currentColor" strokeWidth="6" 
                      fill="transparent" className="text-white/5" 
                    />
                    <circle 
                      cx="40" cy="40" r="36" 
                      stroke="currentColor" strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={226}
                      strokeDashoffset={226 - (226 * score) / 100}
                      className="text-indigo-400" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black">{score}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Quality Score</p>
                  <p className="text-lg font-bold leading-tight">
                    {score >= 80 ? '高効率・高ROI' : score >= 50 ? '標準的・改善可' : '要緊急改善'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl text-xs leading-relaxed text-slate-300 border-l-4 border-indigo-400">
                  <span className="font-bold text-indigo-300 block mb-1">💡 改善のアドバイス</span>
                  {advice}
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-bold mb-1 text-green-400 flex items-center gap-1">
                    <CheckCircleIcon className="w-4 h-4" /> 
                    {reductionMins}分の短縮効果
                  </p>
                  <p className="text-sm text-slate-300">
                    年間 <span className="text-white font-black text-lg">{formatCurrency(savings.annual)}</span> のリソースを創出できます
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  onClick={saveToHistory}
                  className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  保存する
                </button>
                <button 
                  onClick={handleCopySummary}
                  className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 active:scale-95"
                  title="診断サマリーをコピー"
                >
                  <ClipboardDocumentCheckIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <section className="glass-card p-6 rounded-3xl shadow-xl shadow-slate-200/50">
            <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <DocumentArrowDownIcon className="w-4 h-4" /> アウトプット生成
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => generateTemplate('agenda')} 
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-700">議題テンプレート</p>
                  <p className="text-[10px] text-slate-400">目的や議題など5行の構成案</p>
                </div>
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
              </button>
              <button 
                onClick={() => generateTemplate('next')} 
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-700">次回アジェンダ案</p>
                  <p className="text-[10px] text-slate-400">成果に基づき項目を自動構成</p>
                </div>
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
              </button>
              <button 
                onClick={() => generateTemplate('minutes')} 
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-700">議事録フォーマット</p>
                  <p className="text-[10px] text-slate-400">ToDoや決定事項を埋めるだけ</p>
                </div>
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
              </button>
            </div>
          </section>

          {/* History Section */}
          <section className="glass-card p-6 rounded-3xl shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">履歴 (直近20件)</h3>
              <div className="flex gap-4">
                <button onClick={handleExportCSV} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                  <DocumentArrowDownIcon className="w-4 h-4" /> CSV
                </button>
                <button onClick={clearHistory} className="text-xs text-red-400 font-bold hover:text-red-600 transition-colors">全消去</button>
              </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-300">
                  <ArrowPathIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">履歴はまだありません</p>
                </div>
              ) : (
                history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => restoreHistory(item)}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 cursor-pointer transition-all group active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm text-slate-800 truncate pr-2 group-hover:text-indigo-600">{item.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">One-time Cost</p>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(item.oneTimeCost)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${
                          item.score >= 80 ? 'bg-green-100 text-green-700' : 
                          item.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          ROI: {item.score}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {copyFeedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl z-50 animate-bounce-in flex items-center gap-3 border border-slate-700">
          <CheckCircleIcon className="w-6 h-6 text-green-400" />
          <span className="font-bold text-sm">{copyFeedback}</span>
        </div>
      )}

      {/* CSS for animations and custom scroll */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          50% { opacity: 1; transform: translate(-50%, -5px); }
          100% { transform: translate(-50%, 0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-bounce-in { animation: bounce-in 0.4s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
