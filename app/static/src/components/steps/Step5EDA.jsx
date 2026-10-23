import React, { useState } from 'react';
import { RefreshCw, MessageSquare, CheckCircle, ArrowLeft, X } from 'lucide-react';

export default function Step5EDA({
  edaLoading,
  edaOutput,
  edaFeedback,
  setEdaFeedback,
  generateEDA,
  deriveRelationships,
  setStep,
  renderMarkdown
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn relative">
      {/* Left Column: AI EDA Document Viewer - Takes full width now */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-accent/30 pb-3">
            <span className="text-xs font-mono text-textSecondary uppercase tracking-wider">AI AGENT EDA BLUEPRINT</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Refine EDA</span>
              </button>
              <span className="text-[10px] text-textSecondary">Ver. 1.0.0</span>
            </div>
          </div>
          
          {edaLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-24">
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              <span className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is generating EDA analysis blueprint...</span>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none overflow-y-auto max-h-[600px] pr-2">
              {renderMarkdown(edaOutput)}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-accent/20 flex justify-between items-center">
          <button 
            onClick={() => setStep(4)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Spec
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Refine EDA
            </button>
            <button 
              onClick={() => {
                setStep(6);
                deriveRelationships();
              }}
              disabled={edaLoading || !edaOutput}
              className="px-6 py-2.5 bg-success hover:bg-success/90 text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-success/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm and Proceed to Mappings
            </button>
          </div>
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
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-accent/20 pb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 text-textPrimary">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Refine EDA Analysis
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">Instruct the AI to focus on specific tables, metrics, or key checks.</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-accent/30 hover:bg-accent/15 text-textSecondary hover:text-textPrimary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1 flex flex-col justify-end">
              <label className="text-xs font-mono text-textSecondary block">
                Add instructions for refining EDA:
              </label>
              <textarea 
                value={edaFeedback}
                onChange={(e) => setEdaFeedback(e.target.value)}
                placeholder="e.g. Focus on checking unique constraints of customer_id, audit revenue outlier limits..."
                rows={6}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button 
                disabled={!edaFeedback.trim() || edaLoading}
                onClick={() => {
                  generateEDA(edaFeedback);
                  setIsDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-accent/35 hover:bg-accent text-textPrimary font-semibold text-xs rounded-lg transition-colors border border-accent/50 flex items-center justify-center gap-1.5"
              >
                Re-Generate EDA
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-accent/20">
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="w-full py-2.5 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary text-xs font-semibold transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
