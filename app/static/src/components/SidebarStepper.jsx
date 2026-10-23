import React from 'react';
import { Check, ChevronLeft, ChevronRight, Menu, HelpCircle } from 'lucide-react';

export default function SidebarStepper({
  step,
  maxStep = 1,
  setStep,
  status,
  selectedItems,
  finalGoal,
  edaOutput,
  relationships,
  fetchPreview,
  generateEDA,
  deriveRelationships,
  generateERD,
  gcpArchitectureDoc,
  sidebarOpen,
  setSidebarOpen,
  previewData,
  erdMermaid,
  dfdMermaid,
  dfdStatus,
  activePhase,
  setActivePhase
}) {
  const phases = activePhase === 'phase1' ? [
    {
      id: 'requirements',
      title: 'Requirements Spec',
      activeColor: 'bg-primary',
      activeText: 'text-primary',
      doneClass: 'bg-primary/25 text-primary border border-primary/40',
      steps: [
        { num: 1, label: 'Source Selection', enabled: true },
        { num: 2, label: 'Schema Preview', enabled: selectedItems.length > 0 },
        { num: 3, label: 'Context Definition', enabled: selectedItems.length > 0 },
        { num: 4, label: 'Spec Blueprint', enabled: selectedItems.length > 0 && finalGoal.trim() !== '' }
      ]
    },
    {
      id: 'logical_mapping',
      title: 'Logical Model',
      activeColor: 'bg-purple-600',
      activeText: 'text-purple-400',
      doneClass: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
      steps: [
        { num: 5, label: 'EDA Profiling', enabled: maxStep >= 5 || !!edaOutput },
        { num: 6, label: 'Join Mappings', enabled: maxStep >= 6 || (relationships && relationships.length > 0) },
        { num: 7, label: 'ERD Canvas', enabled: maxStep >= 7 || !!erdMermaid }
      ]
    },
    {
      id: 'deployment_gcp',
      title: 'GCP Deploy',
      activeColor: 'bg-emerald-600',
      activeText: 'text-emerald-400',
      doneClass: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
      steps: [
        { num: 8, label: 'GCP Toolset', enabled: maxStep >= 8 || !!gcpArchitectureDoc }
      ]
    }
  ] : activePhase === 'phase2' ? [
    {
      id: 'data_validation',
      title: 'Data Validation',
      activeColor: 'bg-indigo-600',
      activeText: 'text-indigo-400',
      doneClass: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30',
      steps: [
        { num: 11, label: 'DQ Rules', enabled: maxStep >= 11 },
        { num: 12, label: 'Incremental Backup', enabled: maxStep >= 12 },
        { num: 13, label: 'Anomaly Detection', enabled: maxStep >= 13 }
      ]
    }
  ] : [
    {
      id: 'pipeline_design',
      title: 'Pipeline Design',
      activeColor: 'bg-violet-600',
      activeText: 'text-violet-400',
      doneClass: 'bg-violet-600/20 text-violet-400 border border-violet-500/30',
      steps: [
        { num: 14, label: 'Initialize Workspace', enabled: maxStep >= 14 },
        { num: 15, label: 'Bronze Ingestion', enabled: maxStep >= 15 },
        { num: 16, label: 'STTM (Bronze to Silver)', enabled: maxStep >= 16 },
        { num: 17, label: 'Silver Curation', enabled: maxStep >= 17 },
        { num: 18, label: 'Gold Modeling', enabled: maxStep >= 18 }
      ]
    }
  ];

  return (
    <aside
      className={`border-r border-accent/40 bg-card/60 backdrop-blur-md flex flex-col transition-all duration-300 relative shrink-0 ${sidebarOpen ? 'w-64' : 'w-16'
        }`}
    >
      {/* Collapse/Expand Toggle Header */}
      <div className="p-4 border-b border-accent/40 flex items-center justify-between">
        {sidebarOpen && (
          <span className="text-xs font-bold font-mono text-textSecondary uppercase tracking-wider">
            Pipeline Steps
          </span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-1.5 rounded-lg border border-accent/30 bg-background/50 hover:bg-accent/20 hover:border-accent text-textSecondary hover:text-textPrimary transition-all ${!sidebarOpen ? 'mx-auto' : ''
            }`}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Phase Select Tabs */}
      {sidebarOpen && (
        <div className="px-4 py-2.5 border-b border-accent/20 grid grid-cols-3 gap-1.5">
          <button
            onClick={() => {
              setActivePhase('phase1');
              setStep(step >= 1 && step <= 9 ? step : 1);
            }}
            className={`py-1.5 text-center text-[10px] font-bold rounded transition-all border ${
              activePhase === 'phase1'
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            P1: Build
          </button>

          <button
            onClick={() => {
              if (maxStep >= 11) {
                setActivePhase('phase2');
                setStep(step >= 11 && step <= 13 ? step : 11);
              }
            }}
            disabled={!(maxStep >= 11)}
            className={`py-1.5 text-center text-[10px] font-bold rounded transition-all border ${
              activePhase === 'phase2'
                ? 'bg-zinc-800 text-white border-zinc-700'
                : maxStep >= 11
                  ? 'text-zinc-400 hover:text-white border-transparent'
                  : 'text-zinc-600 cursor-not-allowed border-transparent'
            }`}
            title={!(maxStep >= 11) ? 'Complete Build to unlock Validation' : ''}
          >
            P2: Validate
          </button>

          <button
            onClick={() => {
              if (maxStep >= 14) {
                setActivePhase('phase3');
                setStep(step >= 14 && step <= 17 ? step : 14);
              }
            }}
            disabled={!(maxStep >= 14)}
            className={`py-1.5 text-center text-[10px] font-bold rounded transition-all border ${
              activePhase === 'phase3'
                ? 'bg-zinc-800 text-white border-zinc-700'
                : maxStep >= 14
                  ? 'text-zinc-400 hover:text-white border-transparent'
                  : 'text-zinc-600 cursor-not-allowed border-transparent'
            }`}
            title={!(maxStep >= 14) ? 'Approve Validation to unlock Code' : ''}
          >
            P3: Code
          </button>
        </div>
      )}

      {/* Stepper Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {phases.map((phase) => {
          const isPhaseActive = phase.steps.some(s => s.num === step);
          const isPhaseEnabled = phase.steps.some(s => s.enabled);

          return (
            <div
              key={phase.id}
              className={`space-y-3 transition-opacity ${isPhaseEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'
                }`}
            >
              {sidebarOpen && (
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isPhaseActive ? phase.activeText : 'text-textSecondary'
                    }`}>
                    {phase.title}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {phase.steps.map((s) => {
                  const isActive = step === s.num;
                  const isDone = step > s.num;
                  const stepNumToDisplay =
                    phase.id === 'requirements' ? s.num :
                      phase.id === 'logical_mapping' ? s.num - 4 :
                        phase.id === 'deployment_gcp' ? s.num - 4 :
                          phase.id === 'data_validation' ? s.num - 10 :
                            phase.id === 'pipeline_design' ? s.num - 13 : s.num;

                  return (
                    <div
                      key={s.num}
                      onClick={() => {
                        if (s.enabled) {
                          setStep(s.num);
                          if (s.num === 2) {
                            if (!previewData || Object.keys(previewData).length === 0) {
                              fetchPreview();
                            }
                          }
                        }
                      }}
                      className={`flex items-center rounded-lg transition-all ${s.enabled ? 'cursor-pointer' : 'cursor-not-allowed'
                        } ${isActive
                          ? 'bg-accent/15 border border-accent/30'
                          : 'border border-transparent hover:bg-accent/10'
                        } ${sidebarOpen ? 'p-2 space-x-3' : 'p-1.5 justify-center'}`}
                    >
                      {/* Step Indicator Ball */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${isActive
                          ? `${phase.activeColor} text-white shadow-md shadow-primary/10`
                          : isDone
                            ? phase.doneClass
                            : 'bg-card border border-accent/40 text-textSecondary'
                        }`}>
                        {isDone ? <Check className="w-3.5 h-3.5" /> : stepNumToDisplay}
                      </div>

                      {/* Step Text Label (Only when expanded) */}
                      {sidebarOpen && (
                        <span className={`text-xs font-medium transition-colors truncate ${isActive ? 'text-textPrimary font-bold' : 'text-textSecondary'
                          }`}>
                          {s.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {sidebarOpen && <div className="h-[1px] bg-accent/20 my-2" />}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
