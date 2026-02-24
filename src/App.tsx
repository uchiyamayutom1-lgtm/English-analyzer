import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. 型定義 ---
type Token = {
  text: string;
  role: 'S' | 'V' | 'O' | 'C' | 'M' | 'none';
};

type AnalysisResult = {
  tokens: Token[];
  translation: string;
  explanation: string;
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 2. Gemini API 呼び出し処理 ---
  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("APIキーが設定されていません。");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      // モデル名を修正
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        あなたは言語学の専門家です。以下の英文を解析してください。
        "${inputText}"

        【指示】
        1. 英文を意味のまとまりに分割し、S/V/O/C/M の役割を付与してください。
        2. 英文全体の自然な日本語訳を「translation」に入れてください。
        3. 文法解説を「explanation」に日本語で記述してください。
        4. 出力は必ず以下のJSON形式のみとしてください。

        {"tokens": [{"text": "...", "role": "..."}], "translation": "...", "explanation": "..."}
      `;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonString) as AnalysisResult;
      
      setResult(parsedData);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "解析エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans">
      <h1 className="text-3xl font-extrabold text-blue-600 mb-8">English-analyzer</h1>

      <div className="w-full max-w-2xl space-y-4">
        <textarea
          className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none h-32 shadow-sm text-lg"
          placeholder="英文を入力してください..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !inputText.trim()}
          className={`w-full py-4 font-bold rounded-xl transition-all shadow-md text-white
            ${isLoading || !inputText.trim() ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? 'AIが思考中...' : '文法構造を解析する'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {/* 解析結果表示 */}
        {result && !isLoading && (
          <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-widest">Analysis Result</h2>
            
            <div className="flex flex-wrap gap-y-8 gap-x-3 text-xl leading-relaxed">
              {result.tokens.map((token, index) => (
                <div key={index} className="flex flex-col items-center">
                  <span className={`px-1 font-medium ${getRoleColor(token.role)}`}>
                    {token.text}
                  </span>
                  <span className={`text-[11px] font-bold mt-1 px-2 py-0.5 rounded shadow-sm ${getRoleBg(token.role)} text-white`}>
                    {token.role !== 'none' ? token.role : '-'}
                  </span>
                </div>
              ))}
            </div>

            {/* 和訳セクション */}
            <div className="mt-8 p-5 bg-green-50 rounded-xl text-slate-800 text-lg border border-green-100">
              <strong className="text-green-800 block mb-1 text-xs font-bold uppercase">🇯🇵 日本語訳</strong>
              <p>{result.translation}</p>
            </div>

            {/* 解説セクション */}
            <div className="mt-4 p-5 bg-blue-50/50 rounded-xl text-slate-700 text-base border border-blue-100">
              <strong className="text-blue-800 block mb-2 font-bold">💡 AIによる解説:</strong>
              {result.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'S': return 'text-blue-700 border-b-2 border-blue-500';
    case 'V': return 'text-red-700 border-b-2 border-red-500';
    case 'O': return 'text-green-700 border-b-2 border-green-500';
    case 'C': return 'text-orange-700 border-b-2 border-orange-500';
    case 'M': return 'text-slate-500 italic border-b border-dashed border-slate-400';
    default: return 'text-slate-800';
  }
}

function getRoleBg(role: string) {
  switch (role) {
    case 'S': return 'bg-blue-500';
    case 'V': return 'bg-red-500';
    case 'O': return 'bg-green-500';
    case 'C': return 'bg-orange-500';
    case 'M': return 'bg-slate-400';
    default: return 'bg-slate-200';
  }
}