import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- 1. 型定義（TypeScriptの強み） ---
type Token = {
  text: string;
  role: 'S' | 'V' | 'O' | 'C' | 'M' | 'none';
};

type AnalysisResult = {
  tokens: Token[];
  explanation: string;
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 2. Gemini API 呼び出し処理 ---
  const handleAnalyze = async () => {
    // 空欄なら実行しない
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // APIキーの取得（.env.local から）
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("APIキーが設定されていません。.env.local ファイルを確認してください。");
      }

      // Geminiの初期化（高速な Flash モデルを使用）
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // AIへの命令（プロンプト）
      const prompt = `
        あなたは言語学と英語教育の専門家です。以下の英文を解析してください。
        
        【対象の英文】
        "${inputText}"

        【指示】
        1. 英文を意味のまとまり（単語や句）に分割してください。
        2. それぞれのまとまりに対して、S(主語), V(動詞), O(目的語), C(補語), M(修飾語) のいずれかの役割を付与してください。役割がない記号などは 'none' にしてください。
        3. 文法的な構造のポイントを「explanation」として日本語で簡潔に解説してください。
        4. 出力は必ず以下のJSON形式のみとし、マークダウンの記号(\`\`\`json)やその他のテキストは一切含めないでください。

        【出力JSONフォーマット例】
        {
          "tokens": [
            { "text": "The documents", "role": "S" },
            { "text": "were", "role": "V" }
          ],
          "explanation": "ここに解説を記述"
        }
      `;

      // APIへ送信して結果を待つ
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      
      // AIが不要なマークダウンをつけて返してきた場合の対策
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonString) as AnalysisResult;
      
      setResult(parsedData);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "AIの解析中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. 画面の表示（UI） ---
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans">
      <h1 className="text-3xl font-extrabold text-blue-600 mb-8">TOEIC 精読サポート </h1>

      <div className="w-full max-w-2xl space-y-4">
        {/* 入力欄 */}
        <textarea
          className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none h-32 shadow-sm text-lg"
          placeholder="解析したい英文を入力してください... (例: The marketing team finalized the report.)"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        
        {/* 解析ボタン */}
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !inputText.trim()}
          className={`w-full py-4 font-bold rounded-xl transition-all shadow-md text-white
            ${isLoading || !inputText.trim() 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
        >
          {isLoading ? 'AIが思考中...' : '文法構造を解析する'}
        </button>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl shadow-sm">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {/* 解析結果表示 */}
        {result && !isLoading && (
          <div className="mt-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
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

            <div className="mt-10 p-5 bg-blue-50/50 rounded-xl text-slate-700 text-base border border-blue-100 leading-relaxed">
              <strong className="text-blue-800 block mb-2">💡 AIによる解説:</strong>
              {result.explanation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 4. 見た目を整えるヘルパー関数 ---
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
    default: return 'bg-slate-200 text-slate-400';
  }
}