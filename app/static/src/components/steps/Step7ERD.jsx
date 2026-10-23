import React, { useState } from 'react';
import { Sparkles, RefreshCw, ArrowLeft, CheckCircle, MessageSquare, Code, LayoutGrid, X } from 'lucide-react';
import MermaidRenderer from '../MermaidRenderer';

export default function Step7ERD({
  erdMermaid,
  erdLoading,
  erdFeedback,
  setErdFeedback,
  generateERD,
  setStep,
  setGcpArchitectureDoc
}) {
  const [activeTab, setActiveTab] = useState('diagram'); // 'diagram' | 'code'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch relative animate-fadeIn">
      {/* Left: Mermaid diagram workspace - Takes full width now */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Logical ERD Diagram
              </h2>
              <p className="text-sm text-textSecondary">Visual diagram canvas generated dynamically from validated relationship mappings.</p>
            </div>

            {/* Tab Switched Layout */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-background border border-accent/30 p-1 rounded-lg">
                <button
                  id="tab-erd-diagram"
                  onClick={() => setActiveTab('diagram')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'diagram'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Visual ERD
                </button>
                <button
                  id="tab-erd-code"
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'code'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  Mermaid Source
                </button>
              </div>

              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Refine ERD</span>
              </button>
            </div>
          </div>

          {/* Active Tab Workspace */}
          <div className="flex-1 min-h-[400px] flex flex-col bg-background/50 border border-accent/20 rounded-xl p-4 overflow-hidden justify-center relative">
            {erdLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-20">
                <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                <span className="text-sm font-mono text-textSecondary animate-pulse">Rendering ERD diagram canvas...</span>
              </div>
            ) : activeTab === 'diagram' ? (
              <div className="flex-1 w-full overflow-auto flex items-center justify-center">
                {erdMermaid ? (
                  <MermaidRenderer chart={erdMermaid} />
                ) : (
                  <div className="text-xs font-mono text-textSecondary">
                    No logical ERD chart string derived yet.
                  </div>
                )}
              </div>
            ) : (
              <pre className="flex-1 w-full bg-black/40 text-xs font-mono p-4 rounded-lg text-emerald-400 overflow-auto border border-accent/15 leading-relaxed selection:bg-primary/30">
                {erdMermaid || 'No code representation derived yet.'}
              </pre>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-accent/20">
          <button 
            onClick={() => setStep(6)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Mappings
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Refine ERD
            </button>
            <div className="hidden sm:flex p-2.5 bg-success/15 border border-success/30 text-success rounded-lg text-xs font-semibold items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span>Pipeline & ERD Approved!</span>
            </div>
            <button 
              onClick={() => {
                setGcpArchitectureDoc('');
                setStep(8);
              }}
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              Configure GCP Tools
              <Sparkles className="w-4 h-4" />
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
                  Refine ERD Diagram
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">Provide corrections to labels, visual flows, or cardinality mapping descriptors.</p>
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
                ERD Refinements Instructions:
              </label>
              <textarea 
                value={erdFeedback}
                onChange={(e) => setErdFeedback(e.target.value)}
                placeholder="e.g. Change relation between orders and users to 1-to-many, add labels..."
                rows={6}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button 
                disabled={erdLoading}
                onClick={() => {
                  generateERD(erdFeedback);
                  setIsDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-accent/35 hover:bg-accent text-textPrimary font-semibold text-xs rounded-lg transition-colors border border-accent/50 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Regenerate Diagram
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
