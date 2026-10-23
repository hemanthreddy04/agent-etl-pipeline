import React, { useState } from 'react';
import { Layers, RefreshCw, ArrowLeft, CheckCircle, MessageSquare, Sparkles, GitBranch, X } from 'lucide-react';
import MermaidRenderer from '../MermaidRenderer';

export default function Step9Medallion({
  medallionBlueprint,
  medallionDiagram,
  medallionStatus,
  medallionLoading,
  generateMedallion,
  approveMedallion,
  setStep,
  renderMarkdown
}) {
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('diagram'); // 'diagram' | 'blueprint'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isApproved = medallionStatus === 'approved';

  const handleRefine = () => {
    if (!refinementFeedback.trim()) return;
    generateMedallion(refinementFeedback.trim());
    setRefinementFeedback('');
  };

  // -----------------------------------------------
  // LOADING STATE
  // -----------------------------------------------
  if (medallionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col space-y-5 bg-card border border-accent/30 rounded-xl min-h-[600px]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          <Layers className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-mono text-textSecondary animate-pulse">
          AI Agent is designing your Medallion Pipeline Flow...
        </p>
        <p className="text-xs text-textSecondary/60">Generating Blueprint + Dynamic Flow Diagram</p>
      </div>
    );
  }

  // -----------------------------------------------
  // INITIAL — no output yet, show generate button
  // -----------------------------------------------
  if (!medallionBlueprint && !medallionDiagram) {
    return (
      <div className="flex-1 flex items-center justify-center py-10 animate-fadeIn">
        <div className="w-full max-w-2xl bg-card border border-accent/30 rounded-2xl p-10 space-y-6 shadow-xl shadow-black/20 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/30">
              <Layers className="w-10 h-10 text-amber-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Design Medallion Data Pipeline</h2>
          <p className="text-sm text-textSecondary max-w-md mx-auto">
            Generate the Medallion architecture mapping definitions (Bronze, Silver, Gold layers) and data flow rules for your source tables.
          </p>
          <button
            onClick={() => generateMedallion('')}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm flex items-center justify-center gap-2 mx-auto transition-all shadow-lg shadow-amber-500/25"
          >
            <Sparkles className="w-4 h-4" />
            Generate Medallion Data Flow
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------
  // MAIN VIEW (Drawer Integrated)
  // -----------------------------------------------
  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn relative">
      {/* Left Column: Medallion Architecture Canvas - full width */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col hover:border-accent transition-colors duration-300">
        <div className="space-y-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                Medallion Architecture & Data Flow
              </h2>
              <p className="text-sm text-textSecondary">
                Refine the schema layouts and processing tasks mapped sequentially across Bronze, Silver, and Gold layers.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-background border border-accent/30 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('diagram')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'diagram'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Flow Diagram
                </button>
                <button
                  onClick={() => setActiveTab('blueprint')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'blueprint'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  YAML Schema Config
                </button>
              </div>

              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Refine Flow</span>
              </button>
            </div>
          </div>

          {/* Tab contents */}
          <div className="flex-1 min-h-[420px] flex flex-col bg-background/50 border border-accent/20 rounded-xl p-4 overflow-hidden justify-center relative">
            {activeTab === 'diagram' ? (
              <div className="flex-1 w-full overflow-auto flex items-center justify-center">
                {medallionDiagram ? (
                  <MermaidRenderer chart={medallionDiagram} />
                ) : (
                  <div className="text-xs font-mono text-textSecondary">
                    No dynamic data flow diagram string generated yet.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[450px] prose prose-invert max-w-none prose-sm leading-relaxed">
                {renderMarkdown(medallionBlueprint)}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 pt-4 border-t border-accent/20 flex justify-between items-center flex-wrap gap-4">
          <button
            onClick={() => setStep(8)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary text-sm font-medium transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to GCP Tools
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Refine Flow
            </button>
            
            {!isApproved ? (
              <button
                onClick={approveMedallion}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Data Flow
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-success/15 border border-success/30 text-success rounded-lg text-xs font-semibold">
                <CheckCircle className="w-4 h-4" />
                Data Flow Approved!
              </div>
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
                  Refine Data Flow
                </h2>
                <p className="text-xs text-textSecondary mt-1">
                  Adjust the data flow rules or tool mappings. Both will be regenerated together.
                </p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-accent/30 hover:bg-accent/15 text-textSecondary hover:text-textPrimary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isApproved ? (
              <div className="p-4 bg-success/10 border border-success/25 rounded-lg text-success text-xs flex items-start gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Data Flow Design has been approved and saved.
                </span>
              </div>
            ) : (
              <div className="space-y-3 flex-1 flex flex-col justify-end">
                <label className="text-xs font-mono text-textSecondary block">Refinement Instructions:</label>
                <textarea
                  id="medallion-refinement-input"
                  value={refinementFeedback}
                  onChange={(e) => setRefinementFeedback(e.target.value)}
                  placeholder="e.g. Change Load Type in Bronze to CDC replication, and add validation thresholds for CPA and CPC metrics in Silver..."
                  rows={6}
                  className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
                />
                <button
                  id="regenerate-medallion-btn"
                  onClick={() => {
                    handleRefine();
                    setIsDrawerOpen(false);
                  }}
                  disabled={medallionLoading}
                  className="w-full py-2.5 bg-accent/35 hover:bg-amber-600 text-textPrimary hover:text-white font-semibold text-xs rounded-lg transition-colors border border-accent/50 hover:border-amber-600 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Data Flow
                </button>
              </div>
            )}

            {/* Layer summary cards */}
            <div className="space-y-2 mt-2 border-t border-accent/20 pt-4">
              <p className="text-[10px] font-mono text-textSecondary uppercase tracking-wider">Pipeline Layers</p>
              {[
                { layer: 'Bronze', icon: '🥉', desc: 'Raw source ingestion → GCS/BQ raw dataset', color: 'border-amber-700/40 bg-amber-900/20' },
                { layer: 'Silver', icon: '🥈', desc: 'Quality gates & cleaning → BQ conformed', color: 'border-slate-500/40 bg-slate-700/20' },
                { layer: 'Gold', icon: '🥇', desc: 'Curated KPIs & Aggregates → BQ analytical', color: 'border-yellow-600/40 bg-yellow-800/20' },
              ].map(({ layer, icon, desc, color }) => (
                <div key={layer} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${color}`}>
                  <span className="text-base">{icon}</span>
                  <div>
                    <div className="text-xs font-bold">{layer}</div>
                    <div className="text-[10px] text-textSecondary">{desc}</div>
                  </div>
                </div>
              ))}
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
