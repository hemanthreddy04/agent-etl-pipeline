import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ArrowLeft, CheckCircle, MessageSquare, X } from 'lucide-react';

export default function Step9Curation({
  dfdTheory,
  dfdStatus,
  dfdLoading,
  dfdFeedback,
  setDfdFeedback,
  generateDFD,
  approveDFD,
  setStep,
  renderMarkdown,
  setDfdMermaid
}) {
  const [localFeedback, setLocalFeedback] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-generate on mount if empty
  useEffect(() => {
    console.log("Step9Curation mount effect: dfdTheory =", JSON.stringify(dfdTheory), "dfdLoading =", dfdLoading);
    if (!dfdTheory && !dfdLoading) {
      console.log("Step9Curation auto-triggering generateDFD...");
      generateDFD('');
    }
  }, [dfdTheory, dfdLoading, generateDFD]);

  const handleSendFeedback = () => {
    if (!localFeedback.trim()) return;
    setDfdFeedback(localFeedback);
    generateDFD(localFeedback);
    setLocalFeedback('');
  };

  const handleApprove = async () => {
    setSaveStatus("saving");
    try {
      await approveDFD();
      setSaveStatus("success");
      setStep(11); // Automatically proceed to next step
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleConfirmAndProceed = () => {
    setStep(11);
  };

  const isApproved = dfdStatus === 'approved';

  if (dfdLoading) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col space-y-4 py-20 bg-card border border-accent/30 rounded-xl animate-fadeIn">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is refining DFD context specifications...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn relative">
      {/* AI DFD Spec Document Viewer - full width */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-accent/30 pb-3">
            <div>
              <span className="text-xs font-mono text-textSecondary uppercase tracking-wider">AI AGENT DATA FLOW CONTEXT</span>
              <p className="text-[10px] text-textSecondary mt-0.5">Specifications for Medallion layering, Facts & Dimensions, and schema mapping details.</p>
            </div>
            <div className="flex items-center gap-3">
              {isApproved && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/15 border border-success/30 text-success rounded-lg text-xs font-semibold animate-fadeIn shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approved
                </div>
              )}
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Review & Approve</span>
              </button>
            </div>
          </div>
          
          <div className="prose prose-invert max-w-none overflow-y-auto max-h-[500px] pr-2">
            {renderMarkdown(dfdTheory)}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-accent/20 flex justify-between items-center flex-wrap gap-4">
          <button 
            onClick={() => setStep(8)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to GCP Tools
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Review & Approve
            </button>
            
            {!isApproved ? (
              <button 
                onClick={handleApprove}
                disabled={dfdLoading || saveStatus === 'saving'}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                <CheckCircle className="w-4 h-4" />
                {saveStatus === 'saving' ? 'Saving...' : 'Approve Spec'}
              </button>
            ) : (
              <button
                onClick={handleConfirmAndProceed}
                className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
              >
                Confirm and Proceed to Data Validation
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
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
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-textPrimary">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Human Review Loop
                </h2>
                <p className="text-xs text-textSecondary">Provide corrections to layers standardizations, Facts & Dimensions details, or table structures.</p>
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
                DFD Context Refinements Instructions:
              </label>
              <textarea 
                value={localFeedback}
                onChange={(e) => setLocalFeedback(e.target.value)}
                placeholder="e.g. Include specific column renaming maps, or update workday ingest details..."
                rows={6}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button 
                disabled={!localFeedback.trim() || dfdLoading}
                onClick={() => {
                  handleSendFeedback();
                  setIsDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-accent/35 hover:bg-accent text-textPrimary font-semibold text-xs rounded-lg transition-colors border border-accent/50 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Regenerate Specification
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
