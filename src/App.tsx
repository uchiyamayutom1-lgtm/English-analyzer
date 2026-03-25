import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { track } from '@vercel/analytics';
// --- 1. 型定義 ---
type Token = {
  text: string;
  role: 'S' | 'V' | 'O' | 'C' | 'M' | 'none';
};

type AnalysisResult = {
  tokens: Token[];
  bracketedText: string; // 参考書ルールのカッコ付き英文
  translation: string;
  explanation: string;
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    track('AnalyzeInput', { text: inputText }); 

    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("APIキーが設定されていません。");

      const genAI = new GoogleGenerativeAI(apiKey);
      // 最新の安定モデルを使用
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        あなたは英文解釈のプロ講師です。以下の英文を、日本の「英文解釈」の伝統的なルールに基づき解析してください。
        英文: "${inputText}"

        【ルール】
        1. tokens: 英文を意味のまとまりに分け、S/V/O/C/M の役割を付与。
        2. bracketedText: 以下のカッコ記号を使用して、文の構造を視覚化してください。
           - 名詞のカタマリ（句・節）は [ ] で囲む
           - 形容詞のカタマリ（句・節）は ( ) で囲む
           - 副詞のカタマリ（句・節）は < > で囲む
        3. translation: 自然で正確な日本語訳。
        4. explanation: 文法的なポイントをプロの講師のように丁寧に解説。

        出力は必ず以下のJSON形式のみとしてください：
        {"tokens": [{"text": "...", "role": "..."}], "bracketedText": "...", "translation": "...", "explanation": "..."}
      `;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonString) as AnalysisResult;
      
      setResult(parsedData);

    } catch (err: any) {
      console.error(err);
      setError("解析中にエラーが発生しました。コードの文法を確認するか、少し時間を置いて試してください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* ヘッダー */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
            ENGLISH <span className="text-blue-600">STRUCTURE</span>
          </h1>
          <p className="text-slate-500 font-medium">プロレベルの英文解釈・構造解析ツール</p>
        </header>

        {/* 入力エリア */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 mb-8 border border-slate-100">
          <textarea
            className="w-full p-4 text-xl border-none focus:ring-0 outline-none h-32 resize-none placeholder-slate-300"
            placeholder="解析したい英文を入力してください..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all 
              ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black hover:shadow-lg active:scale-95'}`}
          >
            {isLoading ? '解析中...' : '構造を解析する'}
          </button>
        </div>

        {error && <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm">{error}</div>}

        {/* 結果表示エリア */}
        {result && !isLoading && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. カッコ付き英文（参考書ルール） */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4">Bracketed Structure</h2>
              <div className="text-2xl font-serif text-slate-800 leading-relaxed italic border-l-4 border-blue-500 pl-6">
                {result.bracketedText}
              </div>
              <div className="mt-4 flex gap-4 text-[10px] font-bold text-slate-400">
                <span>[名詞句]</span>
                <span>(形容詞句)</span>
                <span>&lt;副詞句&gt;</span>
              </div>
            </div>

            {/* 2. S/V/O/C ブロック解析 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6">Component Analysis</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-8">
                {result.tokens.map((token, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className={`text-xl font-bold px-2 py-1 rounded-lg ${getRoleColor(token.role)}`}>
                      {token.text}
                    </span>
                    <span className={`text-[10px] mt-2 font-black px-2 py-0.5 rounded shadow-sm text-white ${getRoleBg(token.role)}`}>
                      {token.role !== 'none' ? token.role : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 和訳と解説 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Translation</h2>
                <p className="text-slate-800 text-lg leading-relaxed font-medium">{result.translation}</p>
              </div>
              <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
                <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Grammar Notes</h2>
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{result.explanation}</div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'S': return 'text-blue-700 bg-blue-50';
    case 'V': return 'text-rose-700 bg-rose-50';
    case 'O': return 'text-emerald-700 bg-emerald-50';
    case 'C': return 'text-amber-700 bg-amber-50';
    case 'M': return 'text-slate-600 bg-slate-50 italic';
    default: return 'text-slate-800';
  }
}

function getRoleBg(role: string) {
  switch (role) {
    case 'S': return 'bg-blue-600';
    case 'V': return 'bg-rose-600';
    case 'O': return 'bg-emerald-600';
    case 'C': return 'bg-amber-600';
    case 'M': return 'bg-slate-400';
    default: return 'bg-slate-200';
  }
}