import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, CheckCircle2, RotateCw, AlertCircle } from 'lucide-react';

export default function HumanReviewChat({
  step,
  status,
  aiLoading,
  feedbackHistory,
  feedback,
  setFeedback,
  submitFeedback,
  approveBlueprint,
  generateAIBluePrint,
  
  edaLoading,
  edaFeedback,
  setEdaFeedback,
  generateEDA,
  
  relationships,
  erdLoading,
  erdFeedback,
  setErdFeedback,
  generateERD,
  
  toolsLoading,
  toolsFeedback,
  setToolsFeedback,
  fetchToolSuggestions,
  approveGcpArchitecture,
  gcpArchitectureStatus
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show the chat icon/widget on steps 4, 5, 7, and 8
  if (![4, 5, 7, 8].includes(step)) return null;

  const handleSend = () => {
    if (step === 4) {
      submitFeedback();
    } else if (step === 5) {
      generateEDA(edaFeedback);
    } else if (step === 7) {
      generateERD(erdFeedback);
    } else if (step === 8) {
      fetchToolSuggestions(toolsFeedback);
    }
  };

  const getActiveState = () => {
    switch (step) {
      case 4:
        return {
          title: "Specification Review",
          subtitle: "Phase 1 Requirement Spec",
          placeholder: "e.g. Include customer email domain grouping, or modify CAC formula...",
          value: feedback,
          onChange: setFeedback,
          loading: aiLoading,
          logs: feedbackHistory,
          isApproved: status === 'approved'
        };
      case 5:
        return {
          title: "EDA Blueprint Review",
          subtitle: "Phase 2 Data Quality Profiling",
          placeholder: "e.g. Filter out campaign sales where total amount is negative...",
          value: edaFeedback,
          onChange: setEdaFeedback,
          loading: edaLoading,
          logs: [],
          isApproved: false
        };
      case 7:
        return {
          title: "ERD Canvas Review",
          subtitle: "Phase 2 Logical Schema Model",
          placeholder: "e.g. Add logical link between customer_engagement and campaigns...",
          value: erdFeedback,
          onChange: setErdFeedback,
          loading: erdLoading,
          logs: [],
          isApproved: false
        };
      case 8:
        return {
          title: "GCP Toolset Review",
          subtitle: "Phase 2 Medallion Architecture Selection",
          placeholder: "e.g. Prioritize Cloud Run for processing instead of Dataproc...",
          value: toolsFeedback,
          onChange: setToolsFeedback,
          loading: toolsLoading,
          logs: [],
          isApproved: gcpArchitectureStatus === 'approved'
        };
      default:
        return null;
    }
  };

  const state = getActiveState();
  if (!state) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] bg-[#121214] border border-accent/40 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-slideUp">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-purple-600 border-b border-accent/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <MessageSquare className="w-5 h-5 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm tracking-wide">{state.title}</h3>
                <p className="text-[10px] text-white/70 font-mono">{state.subtitle}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages & Logs area */}
          <div className="flex-1 p-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar bg-background/30">
            
            {/* System Info message */}
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 bg-[#1c1c1e] rounded-2xl rounded-tl-none border border-accent/20 text-xs text-textPrimary leading-relaxed">
                Here is the generated analysis. Let me know if you need any adjustments, or click **Approve** to save and advance.
              </div>
            </div>

            {/* Custom feedback log (Step 4 only) */}
            {state.logs.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-mono text-textSecondary uppercase tracking-wider block">Refinement Log</span>
                {state.logs.map((log, idx) => (
                  <div key={idx} className="flex justify-end gap-2">
                    <div className="p-2.5 bg-primary/10 border border-primary/25 rounded-xl rounded-tr-none text-xs text-textPrimary max-w-[80%] font-sans">
                      {log}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {state.isApproved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-400">
                  <span className="font-bold">Step Approved</span>
                  <p className="text-[10px] text-textSecondary mt-0.5">Ready to progress to the next step.</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="p-4 border-t border-accent/30 bg-[#121214] space-y-3">
            
            {/* Input area */}
            {!state.isApproved && (
              <div className="relative">
                <textarea
                  value={state.value}
                  onChange={(e) => state.onChange(e.target.value)}
                  placeholder={state.placeholder}
                  rows={2}
                  disabled={state.loading}
                  className="w-full bg-[#1b1b1f] border border-accent/40 rounded-xl p-3 pr-10 text-xs text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary transition-all font-sans resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={state.loading || !state.value.trim()}
                  className="absolute right-2 bottom-3 p-1.5 rounded-lg bg-primary hover:bg-primaryHover text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Send refinements"
                >
                  {state.loading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}

            {/* Quick Action buttons */}
            <div className="flex gap-2">
              {step === 4 && !state.isApproved && (
                <button
                  onClick={approveBlueprint}
                  disabled={state.loading}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Spec
                </button>
              )}
              {step === 8 && !state.isApproved && (
                <button
                  onClick={approveGcpArchitecture}
                  disabled={state.loading}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve GCP Design
                </button>
              )}
              
              {/* Reset/Regen option */}
              <button
                onClick={() => {
                  if (step === 4) generateAIBluePrint();
                  else if (step === 5) generateEDA();
                  else if (step === 7) generateERD();
                  else if (step === 8) fetchToolSuggestions();
                }}
                disabled={state.loading}
                className="flex-1 py-2 px-3 bg-accent/25 hover:bg-accent/40 border border-accent/40 text-textPrimary font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
              >
                <RotateCw className={`w-3.5 h-3.5 ${state.loading ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-purple-600 hover:from-primaryHover hover:to-purple-700 text-white flex items-center justify-center shadow-2xl glow-primary transition-all duration-300 transform hover:scale-105 relative"
        title="Open review assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-fadeIn" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 animate-fadeIn" />
            {!state.isApproved && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#09090b] animate-pulse" />
            )}
          </>
        )}
      </button>

    </div>
  );
}
