import React from 'react';
import { Sparkles, Home } from 'lucide-react';

export default function Header({ step, status, onExit, pipelineId, sourceType }) {
  return (
    <header className="border-b border-accent/40 glass py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-wide bg-gradient-to-r from-white to-textSecondary bg-clip-text text-transparent">
              Agentic ETL Pipeline
            </h1>
            {pipelineId && (
              <span className="text-[10px] px-2 py-0.5 bg-accent/20 border border-accent/40 text-textSecondary rounded font-mono">
                ID: {pipelineId}
              </span>
            )}
            {sourceType && (
              <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded font-mono uppercase tracking-wider font-semibold">
                {sourceType}
              </span>
            )}
          </div>
          <p className="text-xs text-textSecondary font-mono mt-0.5">
            {step <= 4 ? "Phase 1: Context & Requirement Agent" : step <= 7 ? "Phase 2: Logical Model & Mapping Agent" : "Phase 3: Medallion Architecture GCP Selection"}
          </p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center space-x-4">
        {onExit && (
          <button
            id="switch-project-btn"
            onClick={onExit}
            className="px-3 py-1.5 border border-accent/40 rounded-lg hover:border-accent hover:bg-accent/10 text-xs font-semibold text-textSecondary hover:text-textPrimary transition-all bg-[#18181b] flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5 text-primary" />
            <span>Main Menu</span>
          </button>
        )}
        <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
          status === 'approved' ? 'bg-success/10 border-success text-success' : 'bg-warning/10 border-warning text-warning'
        }`}>
          {(status || '').toUpperCase()}
        </span>
      </div>
    </header>
  );
}
