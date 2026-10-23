import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ArrowLeft, CheckCircle, MessageSquare, ShieldCheck, Cpu, Send, X } from 'lucide-react';

export default function Step8Tools({
  gcpArchitectureDoc,
  gcpArchitectureStatus,
  toolsLoading,
  toolsFeedback,
  setToolsFeedback,
  fetchToolSuggestions,
  approveGcpArchitecture,
  setStep,
  renderMarkdown,
  setGcpArchitectureDoc,
  setDfdTheory,
  setDfdMermaid
}) {
  const [userToolInput, setUserToolInput] = useState(
    'GCS for landing zone, BigQuery for data warehouse, Cloud Composer (Airflow) for orchestration, Dataflow for transformations, and Dataplex for governance.'
  );
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-generate tools document on mount if it's empty
  useEffect(() => {
    console.log("Step8Tools mount effect: gcpArchitectureDoc =", JSON.stringify(gcpArchitectureDoc), "toolsLoading =", toolsLoading);
    if (!gcpArchitectureDoc && !toolsLoading) {
      console.log("Step8Tools auto-triggering fetchToolSuggestions with:", userToolInput.trim());
      fetchToolSuggestions(userToolInput.trim());
    }
  }, [gcpArchitectureDoc, toolsLoading, fetchToolSuggestions, userToolInput]);

  const handleGenerate = () => {
    if (!userToolInput.trim()) return;
    fetchToolSuggestions(userToolInput.trim());
  };

  const handleRefine = () => {
    if (!refinementFeedback.trim()) return;
    setToolsFeedback(refinementFeedback);
    fetchToolSuggestions(refinementFeedback.trim());
    setRefinementFeedback('');
  };

  const handleApprove = async () => {
    setSaveStatus("saving");
    try {
      await approveGcpArchitecture();
      setSaveStatus("success");
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const isApproved = gcpArchitectureStatus === 'approved';

  // -----------------------------------------------
  // INITIAL STATE: show user input form
  // -----------------------------------------------
  if (!gcpArchitectureDoc && !toolsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-10 animate-fadeIn">
        <div className="w-full max-w-2xl bg-card border border-accent/30 rounded-2xl p-8 space-y-6 shadow-xl shadow-black/20">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/15 rounded-full border border-primary/30">
                <Cpu className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">GCP Infrastructure Toolset</h2>
            <p className="text-sm text-textSecondary max-w-md mx-auto">
              Describe the GCP tools and services you plan to use for this pipeline. The AI agent will finalize a structured deployment architecture specification based on your input.
            </p>
          </div>

          {/* Example hint */}
          <div className="p-3 bg-accent/20 rounded-lg border border-accent/30 text-xs text-textSecondary font-mono leading-relaxed">
            <span className="text-primary font-semibold">Example: </span>
            "GCS for landing zone, BigQuery for data warehouse, Dataflow for transformations, Cloud Composer for orchestration, Secret Manager for credentials, Cloud Build for CI/CD, and Dataplex for governance."
          </div>

          {/* Main input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-textPrimary block">
              Describe your toolset <span className="text-primary">*</span>
            </label>
            <textarea
              id="tool-description-input"
              value={userToolInput}
              onChange={(e) => setUserToolInput(e.target.value)}
              placeholder="e.g. We use GCS for raw storage, BigQuery for the warehouse, Airflow (Cloud Composer) for orchestration, Jenkins for CI/CD, and Secret Manager for credentials..."
              rows={6}
              className="w-full bg-background border border-accent/40 rounded-xl p-4 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
              }}
            />
            <p className="text-xs text-textSecondary">Press Ctrl+Enter to generate</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-between pt-2">
            <button
              id="back-to-erd-btn"
              onClick={() => setStep(7)}
              className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to ERD
            </button>
            <button
              id="generate-gcp-architecture-btn"
              onClick={handleGenerate}
              disabled={!userToolInput.trim()}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Generate Architecture Specification
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------
  // LOADING STATE
  // -----------------------------------------------
  if (toolsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col space-y-4 py-20 bg-card border border-accent/30 rounded-xl">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is finalizing the GCP Architecture Specification...</p>
      </div>
    );
  }

  // -----------------------------------------------
  // SPEC DOCUMENT VIEW (Drawer Integrated)
  // -----------------------------------------------
  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn relative">
      {/* AI Spec Document Viewer - full width */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col hover:border-accent transition-colors duration-300">
        <div className="flex justify-between items-start mb-4 border-b border-accent/30 pb-3">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              GCP Deployment Architecture Specification
            </h2>
            <p className="text-xs text-textSecondary mt-1">
              AI-finalized infrastructure document based on your described toolset. Refine as needed and approve to lock it in.
            </p>
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
              <span>Refine Specification</span>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-background border border-accent/20 rounded-xl p-6 overflow-y-auto max-h-[500px] prose prose-invert max-w-none prose-sm leading-relaxed prose-headings:font-bold prose-a:text-primary mb-6">
          {renderMarkdown(gcpArchitectureDoc)}
        </div>

        <div className="mt-2 pt-4 border-t border-accent/20 flex justify-between items-center flex-wrap gap-4">
          <button
            id="back-to-erd-spec-btn"
            onClick={() => setStep(7)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary text-sm font-medium transition-colors"
          >
            Back to ERD Canvas
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Refine Specification
            </button>
            
            {!isApproved ? (
              <>
                <button
                  id="reset-gcp-architecture-btn"
                  onClick={() => {
                    setGcpArchitectureDoc('');
                  }}
                  className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary text-xs font-medium transition-colors"
                >
                  Start Over / Regenerate
                </button>
                
                <button
                  id="approve-gcp-architecture-btn"
                  onClick={handleApprove}
                  disabled={saveStatus === 'saving'}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  {saveStatus === 'saving' ? 'Approving...' : 'Approve & Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setStep(11);
                }}
                className="px-6 py-2.5 bg-primary hover:bg-primaryHover text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
              >
                Confirm and Proceed to Validation
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
                <h2 className="text-lg font-semibold flex items-center gap-2 text-textPrimary">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Refine Specification
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">
                  Provide updated instructions to swap tools, change justifications, or add new sections.
                </p>
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
                Refinement Instructions:
              </label>
              <textarea
                id="refinement-feedback-input"
                value={refinementFeedback}
                onChange={(e) => setRefinementFeedback(e.target.value)}
                placeholder="e.g. Replace Jenkins with Cloud Build, and use Airflow instead of Cloud Workflows..."
                rows={6}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button
                id="regenerate-specification-btn"
                onClick={() => {
                  handleRefine();
                  setIsDrawerOpen(false);
                }}
                disabled={!refinementFeedback.trim() || toolsLoading}
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
