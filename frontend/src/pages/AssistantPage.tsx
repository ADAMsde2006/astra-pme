import React, { useState } from 'react';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  evidence?: any;
  timestamp: string;
}

const PRESET_PROMPTS = [
  "Why is project 612786 high risk?",
  "What are the major portfolio bottlenecks?",
  "Which projects require attention within 3 months?",
  "Which projects have contradictory data?",
  "Which projects have increasing schedule risk?",
  "Show top projects on the watchlist",
  "Which projects have poor data confidence?"
];

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `### ASTRA Decision Support Assistant (Deterministic Rules Mode)
I provide evidence-based analytical responses directly from the longitudinal PAIMANA/OCMS dataset and trained ML risk models.

Supported Queries:
- Project-specific risk breakdowns & drivers (e.g., "Why is project 612786 high risk?")
- Portfolio systemic bottlenecks & executing agency delay concentrations
- 3-month forward horizon early warnings
- Data contradictions and schema audit issues
- Watchlist prioritization queries

Note: Operating in deterministic rule mode. Architecture is pre-configured for future Ollama + Qwen 2.5 3B local integration without API contract changes.`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.queryAssistant(queryText);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.response,
        evidence: res.evidence,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error processing query: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2d3139] pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
              Decision Support Assistant
            </h1>
            <span className="text-[10px] bg-indigo-950/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800 font-mono font-bold">
              [DETERMINISTIC RULES ENGINE]
            </span>
          </div>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Deterministic evidence retrieval and reasoning engine answering administrative monitoring inquiries.
          </p>
        </div>

        <div className="text-[10px] font-mono text-[#858585] hidden md:block">
          Pipeline: <span className="text-white font-bold">ASTRA -&gt; Evidence Packager -&gt; Grounding Validator</span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono select-none">
        <span className="text-[#858585] text-[10px] font-bold mr-1">
          [PROMPT SHORTCUTS]:
        </span>
        {PRESET_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-2 py-0.5 rounded bg-[#252526] border border-[#3e4451] hover:border-[#007acc] text-[#cccccc] hover:text-white transition-colors whitespace-nowrap text-[11px]"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-[#1e1e1e] border border-[#2d3139] rounded p-3 overflow-y-auto space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 text-xs ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-6 h-6 rounded bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-300 font-mono font-bold text-[10px] shrink-0">
                AST
              </div>
            )}

            <div
              className={`max-w-[85%] rounded p-2.5 font-mono leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#007acc] text-white'
                  : 'bg-[#252526] border border-[#2d3139] text-[#e1e4e8]'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans text-xs">
                {msg.text}
              </div>
              <div className="text-[10px] text-[#858585] font-mono mt-1.5 text-right">
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded bg-[#333333] border border-[#444444] flex items-center justify-center text-white font-mono font-bold text-[10px] shrink-0">
                USR
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start text-xs font-mono text-[#858585] items-center">
            <div className="w-6 h-6 rounded bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-300 font-mono text-[10px]">
              ...
            </div>
            <span>[Evaluating project evidence and deterministic rules...]</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 bg-[#252526] border border-[#2d3139] rounded p-1.5"
      >
        <input
          type="text"
          placeholder="Ask a project or portfolio question (e.g. 'Why is project 612786 high risk?')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-[#1e1e1e] border border-[#3e4451] rounded px-2.5 py-1.5 text-xs font-mono text-white placeholder-[#666666] focus:outline-none focus:border-[#007acc]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3.5 py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white rounded text-xs font-mono font-bold transition-colors"
        >
          SEND
        </button>
      </form>

    </div>
  );
};
