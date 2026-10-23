import React, { useState } from 'react';
import { RefreshCw, MessageSquare, CheckCircle, ArrowLeft, X } from 'lucide-react';

export default function Step4Build({
  aiLoading,
  aiOutput,
  feedbackHistory,
  feedback,
  setFeedback,
  submitFeedback,
  status,
  approveBlueprint,
  setStep,
  generateAIBluePrint,
  renderMarkdown
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn relative">
      {/* AI Document Viewer - Takes full width now */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-accent/30 pb-3">
            <span className="text-xs font-mono text-textSecondary uppercase tracking-wider">AI AGENT SPECIFICATION BLUEPRINT</span>
            <div className="flex items-center gap-3">
              {status === 'approved' && (
                <span className="px-2 py-0.5 rounded bg-success/15 border border-success/30 text-success text-[10px] font-mono uppercase font-bold">Approved</span>
              )}
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Review & Approve</span>
              </button>
              <span className="text-[10px] text-textSecondary">Ver. 1.0.0</span>
            </div>
          </div>
          
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-24">
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              <span className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is generating Business Blueprint...</span>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none overflow-y-auto max-h-[600px] pr-2">
              {renderMarkdown(aiOutput)}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-accent/20 flex justify-between items-center">
          <button 
            onClick={() => setStep(3)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Context
          </button>
          
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 hover:from-primaryHover hover:to-purple-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 glow-primary"
          >
            <MessageSquare className="w-4 h-4" />
            Open Review & Approve Panel
          </button>
        </div>
      </div>

      {/* Drawer Overlay Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-[#121216] border-l border-accent/30 p-6 shadow-2xl z-[101] flex flex-col justify-between transform transition-transform duration-300 ease-out ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full justify-between">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center border-b border-accent/20 pb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-textPrimary">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Human Review Loop
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">Review the specification. Approve or request specific refinements.</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-accent/30 hover:bg-accent/15 text-textSecondary hover:text-textPrimary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Feedback history log */}
            {feedbackHistory.length > 0 && (
              <div className="bg-background rounded-lg p-3.5 border border-accent/30 max-h-[180px] overflow-y-auto space-y-2">
                <span className="text-[10px] font-mono text-textSecondary uppercase tracking-wider block">Feedback Log</span>
                {feedbackHistory.map((fb, fidx) => (
                  <div key={fidx} className="text-xs text-textSecondary border-l-2 border-primary/50 pl-2 leading-relaxed">
                    {fb}
                  </div>
                ))}
              </div>
            )}

            {/* Input refinement feedback */}
            <div className="space-y-2 flex-1 flex flex-col justify-end">
              <label className="text-xs font-mono text-textSecondary block">
                Need refinements? Add instructions below:
              </label>
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Include customer email domain grouping, or modify CAC formula details..."
                rows={5}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button 
                disabled={!feedback.trim() || aiLoading}
                onClick={submitFeedback}
                className="w-full py-2.5 bg-accent/35 hover:bg-accent text-textPrimary font-semibold text-xs rounded-lg transition-colors border border-accent/50 flex items-center justify-center gap-1.5"
              >
                Send Refinements
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-accent/20 space-y-4">
            {status === 'approved' ? (
              <div className="p-4 bg-success/10 border border-success/30 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-success shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-success">Pipeline Specification Approved</h4>
                  <p className="text-xs text-textSecondary">Ready to initialize Phase 2 deployment scripts.</p>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  approveBlueprint();
                  setIsDrawerOpen(false);
                }}
                disabled={aiLoading}
                className="w-full py-3.5 bg-success hover:bg-success/90 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-success/15"
              >
                <CheckCircle className="w-4 h-4" />
                Approve and Save Specification
              </button>
            )}

            <div className="flex gap-2">
              <button 
                onClick={generateAIBluePrint}
                disabled={aiLoading}
                className="flex-1 py-2.5 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold transition-colors rounded-lg border border-accent/50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                Regenerate AI Spec
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
