import React, { useState, useEffect } from 'react';
import { Layers, Plus, Database, ArrowRight, Activity, ClipboardList } from 'lucide-react';

export default function PipelineSelector({ onCreateNew, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-textPrimary flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-4xl space-y-8 animate-fadeIn">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-primary/10 border border-primary/20 rounded-2xl mb-2">
            <Layers className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-indigo-500 bg-clip-text text-transparent">
            Agentic ETL Pipeline Workspace
          </h1>
          <p className="text-textSecondary text-sm max-w-lg mx-auto">
            Design, profile, and architect production-grade Medallion data pipelines on Google Cloud Platform with agent-driven guidance.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid md:grid-cols-5 gap-6 items-stretch">
          
          {/* Left Panel: Create New */}
          <div className="md:col-span-2 bg-[#121214] border border-accent/20 rounded-2xl p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-xl group">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit group-hover:bg-emerald-500/20 transition-colors">
                <Plus className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">New Data Pipeline</h2>
              <p className="text-xs text-textSecondary leading-relaxed">
                Connect a new BigQuery dataset or Google Cloud Storage bucket, profile schemas, map relations, and design deployment tools.
              </p>
            </div>
            
            <button
              onClick={onCreateNew}
              className="mt-8 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 group-hover:translate-y-[-2px]"
            >
              Start New Pipeline
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Panel: Load Existing */}
          <div className="md:col-span-3 bg-[#121214] border border-accent/20 rounded-2xl p-6 flex flex-col hover:border-purple-500/30 transition-all duration-300 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-bold">Load Existing Pipeline</h2>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="text-xs text-textSecondary font-mono">Fetching active pipelines...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-accent/20 rounded-xl p-8 text-center text-textSecondary">
                <ClipboardList className="w-8 h-8 text-accent/40 mb-2" />
                <p className="text-xs">No active pipelines found in backend.</p>
                <p className="text-[10px] text-accent/40 mt-1">Create a new pipeline to get started.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-2.5 custom-scrollbar">
                {projects.map((project) => (
                  <div
                    key={project.pipeline_id}
                    onClick={() => onSelectProject(project.pipeline_id)}
                    className="p-4 bg-[#1b1b1f] border border-accent/40 rounded-xl hover:border-primary/60 hover:bg-accent/10 transition-all duration-200 cursor-pointer flex justify-between items-center group/item"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-purple-400 group-hover/item:text-primary">
                          {project.pipeline_id}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded font-mono uppercase tracking-wider font-semibold">
                          {project.source_type}
                        </span>
                      </div>
                      <div className="text-xs text-textSecondary truncate max-w-xs md:max-w-md">
                        <span className="font-mono text-textPrimary/40 mr-1">Path:</span>
                        <span className="text-textPrimary font-mono">{project.source_path}</span>
                      </div>
                      {project.final_goal && (
                        <div className="text-[11px] text-textSecondary italic truncate max-w-xs md:max-w-md">
                          "{project.final_goal}"
                        </div>
                      )}
                    </div>
                    <div className="ml-4 p-2 rounded-lg bg-accent/30 group-hover/item:bg-primary text-textSecondary group-hover/item:text-white transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
