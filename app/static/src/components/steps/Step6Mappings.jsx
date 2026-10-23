import React, { useState } from 'react';
import { Database, ChevronDown, ChevronRight, Info, RefreshCw, X, ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';

export default function Step6Mappings({
  selectedItems,
  expandedTables,
  setExpandedTables,
  previewData,
  relationshipsLoading,
  relationships,
  setRelationships,
  relationshipFeedback,
  setRelationshipFeedback,
  deriveRelationships,
  generateERD,
  setStep
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch relative animate-fadeIn">
      {/* Schema Reference Panel */}
      <div className="w-full lg:w-72 bg-card border border-accent/30 rounded-xl p-5 flex flex-col space-y-4 hover:border-accent transition-colors duration-300 overflow-y-auto max-h-[400px] lg:max-h-none">
        <div>
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-textPrimary">
            <Database className="w-4 h-4 text-primary" />
            Schema Reference
          </h3>
          <p className="text-[11px] text-textSecondary">List of fields in your selected tables.</p>
        </div>
        
        <div className="space-y-2 overflow-y-auto pr-1 flex-1">
          {selectedItems.map((tableName) => {
            const isExpanded = !!expandedTables[tableName];
            return (
              <div key={tableName} className="bg-background border border-accent/20 rounded-lg p-3 space-y-2">
                <button 
                  onClick={() => setExpandedTables(prev => ({ ...prev, [tableName]: !prev[tableName] }))}
                  className="w-full flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-xs font-mono font-bold text-primary truncate max-w-[85%]">{tableName}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-textSecondary shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-textSecondary shrink-0" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 pt-1 border-t border-accent/10 animate-fadeIn">
                    {previewData[tableName]?.schema.map((col) => (
                      <div key={col.name} className="flex justify-between items-center text-[10px] font-mono border-b border-accent/10 pb-1">
                        <span className="text-textPrimary font-semibold truncate mr-2" title={col.name}>{col.name}</span>
                        <span className="text-textSecondary text-[9px] uppercase shrink-0">{col.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Panel: Relationship list & manual overrides */}
      <div className="flex-1 bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300 overflow-y-auto max-h-[650px] lg:max-h-none">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Verify Logical Relationships
              </h2>
              <p className="text-sm text-textSecondary">Confirm the entity key mappings discovered by the agent based on your business specs.</p>
            </div>
            
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-3.5 py-1.5 bg-primary hover:bg-primaryHover text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 glow-primary"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Refine Mappings</span>
            </button>
          </div>

          {relationshipsLoading ? (
            <div className="flex-1 flex items-center justify-center flex-col space-y-4 py-20">
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              <span className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is deriving logical mappings...</span>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2">
              {relationships.length === 0 ? (
                <div className="text-center py-12 text-textSecondary border border-dashed border-accent/40 rounded-xl">
                  No relationships derived. You can manually create links or ask the AI to re-evaluate.
                </div>
              ) : (
                relationships.map((rel, idx) => (
                  <div key={idx} className="p-4 bg-background border border-accent/30 rounded-lg space-y-3 relative hover:border-accent/80 transition-colors">
                    <button 
                      onClick={() => setRelationships(relationships.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-textSecondary hover:text-red-400 p-1 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-3 text-sm flex-wrap font-mono">
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">{rel.source_table}.{rel.source_key}</span>
                      <span className="text-textSecondary text-xs">➔</span>
                      <span className="bg-accent/20 text-textPrimary px-2.5 py-1 rounded-md border border-accent/30">{rel.relationship_type}</span>
                      <span className="text-textSecondary text-xs">➔</span>
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20">{rel.target_table}.{rel.target_key}</span>
                    </div>
                    
                    <p className="text-xs text-textSecondary font-sans">{rel.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
          
          {/* Manual Add Relationship Form */}
          <div className="p-4 bg-background/50 border border-accent/20 rounded-xl space-y-3 mt-4">
            <span className="text-xs font-mono text-textSecondary uppercase tracking-wider block">Add Custom Mapping Link</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <input 
                type="text" 
                id="new_src_tbl" 
                placeholder="Source Table" 
                className="bg-background border border-accent/40 rounded-lg p-2 text-xs text-textPrimary focus:outline-none focus:border-primary"
              />
              <input 
                type="text" 
                id="new_src_key" 
                placeholder="Source Key" 
                className="bg-background border border-accent/40 rounded-lg p-2 text-xs text-textPrimary focus:outline-none focus:border-primary"
              />
              <select 
                id="new_rel_type" 
                className="bg-background border border-accent/40 rounded-lg p-2 text-xs text-textPrimary focus:outline-none focus:border-primary"
              >
                <option value="Many-to-One">Many-to-One</option>
                <option value="One-to-Many">One-to-Many</option>
                <option value="One-to-One">One-to-One</option>
                <option value="Many-to-Many">Many-to-Many</option>
              </select>
              <input 
                type="text" 
                id="new_tgt_tbl" 
                placeholder="Target Table" 
                className="bg-background border border-accent/40 rounded-lg p-2 text-xs text-textPrimary focus:outline-none focus:border-primary"
              />
              <input 
                type="text" 
                id="new_tgt_key" 
                placeholder="Target Key" 
                className="bg-background border border-accent/40 rounded-lg p-2 text-xs text-textPrimary focus:outline-none focus:border-primary"
              />
            </div>
            <button 
              onClick={() => {
                const srcTbl = document.getElementById("new_src_tbl").value.trim();
                const srcKey = document.getElementById("new_src_key").value.trim();
                const relType = document.getElementById("new_rel_type").value;
                const tgtTbl = document.getElementById("new_tgt_tbl").value.trim();
                const tgtKey = document.getElementById("new_tgt_key").value.trim();
                
                if (srcTbl && srcKey && tgtTbl && tgtKey) {
                  setRelationships([...relationships, {
                    source_table: srcTbl,
                    source_key: srcKey,
                    relationship_type: relType,
                    target_table: tgtTbl,
                    target_key: tgtKey,
                    description: "Manually registered mapping link definition."
                  }]);
                  document.getElementById("new_src_tbl").value = "";
                  document.getElementById("new_src_key").value = "";
                  document.getElementById("new_tgt_tbl").value = "";
                  document.getElementById("new_tgt_key").value = "";
                } else {
                  alert("Please fill in all mapping keys.");
                }
              }}
              className="w-full py-1.5 bg-accent/20 hover:bg-accent/40 text-textPrimary text-xs font-semibold rounded-lg border border-accent/30 transition-colors"
            >
              Add Mapping Link
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-accent/20">
          <button 
            onClick={() => setStep(5)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to EDA
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2 bg-accent/20 hover:bg-accent text-textPrimary text-xs font-semibold border border-accent/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Refine Mappings
            </button>
            <button 
              onClick={() => generateERD()}
              disabled={relationships.length === 0}
              className="px-6 py-3 rounded-lg bg-primary hover:bg-primaryHover text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 animate-pulse"
            >
              Generate ERD Diagram
              <ArrowRight className="w-4 h-4" />
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
                  Refine Relationships
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">Provide guidelines to direct the agent on how to align join targets or keys.</p>
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
                Relationship Refinements Instructions:
              </label>
              <textarea 
                value={relationshipFeedback}
                onChange={(e) => setRelationshipFeedback(e.target.value)}
                placeholder="e.g. Orders should join to customer on customer_id instead of email, check campaign links..."
                rows={6}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-xs text-textPrimary focus:outline-none focus:border-primary transition-colors font-sans resize-none"
              />
              <button 
                disabled={!relationshipFeedback.trim() || relationshipsLoading}
                onClick={() => {
                  deriveRelationships(relationshipFeedback);
                  setIsDrawerOpen(false);
                }}
                className="w-full py-2.5 bg-accent/35 hover:bg-accent text-textPrimary font-semibold text-xs rounded-lg transition-colors border border-accent/50 flex items-center justify-center gap-1.5"
              >
                Re-Derive Mappings
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
