import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Database, HelpCircle, Check, Play, AlertCircle } from 'lucide-react';

export default function Step5DQ({
  projectId,
  dqLoading,
  dqRules,
  generateDqRules,
  saveDqRules,
  selectedDqRules,
  setSelectedDqRules,
  setStep,
  tables
}) {
  const [activeTable, setActiveTable] = useState(tables[0] || "");
  const [rulesForActiveTable, setRulesForActiveTable] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, success, error
  const [dqFeedback, setDqFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    if (tables.length > 0 && !activeTable) {
      setActiveTable(tables[0]);
    }
  }, [tables, activeTable]);

  // Generate rules if empty on mount
  useEffect(() => {
    if ((!dqRules || Object.keys(dqRules).length === 0) && !dqLoading && projectId) {
      generateDqRules();
    }
  }, [dqRules, dqLoading, projectId, generateDqRules]);

  // Load rules and initialize selected rules for the active table
  useEffect(() => {
    if (dqRules && activeTable && dqRules[activeTable]) {
      setRulesForActiveTable(dqRules[activeTable]);
      
      // If no selections exist for this table yet, select all by default
      if (!selectedDqRules[activeTable]) {
        setSelectedDqRules(prev => ({
          ...prev,
          [activeTable]: dqRules[activeTable]
        }));
      }
    } else {
      setRulesForActiveTable([]);
    }
  }, [dqRules, activeTable, selectedDqRules, setSelectedDqRules]);

  const handleToggleRule = (rule) => {
    const activeSelections = selectedDqRules[activeTable] || [];
    const isSelected = activeSelections.some(r => r.rule_name === rule.rule_name);
    
    let newSelections;
    if (isSelected) {
      newSelections = activeSelections.filter(r => r.rule_name !== rule.rule_name);
    } else {
      newSelections = [...activeSelections, rule];
    }
    
    setSelectedDqRules(prev => ({
      ...prev,
      [activeTable]: newSelections
    }));
  };

  const handleSelectAll = () => {
    const activeSelections = selectedDqRules[activeTable] || [];
    const allSelected = activeSelections.length === rulesForActiveTable.length;
    
    setSelectedDqRules(prev => ({
      ...prev,
      [activeTable]: allSelected ? [] : [...rulesForActiveTable]
    }));
  };

  const handleSaveAndProceed = async () => {
    setSaveStatus("saving");
    try {
      await saveDqRules(selectedDqRules);
      setSaveStatus("success");
      setTimeout(() => {
        setStep(12); // Proceed to step 12 (Workspace Initialization)
      }, 800);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleRefineDqRules = async () => {
    if (!dqFeedback.trim()) return;
    setRefining(true);
    try {
      const res = await fetch('/api/refine-dq-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: dqFeedback,
          existing_rules: dqRules
        })
      });
      if (res.ok) {
        const refined = await res.json();
        // Update dqRules with refined results by calling generateDqRules callback with data override
        // We use a workaround: directly mutate via setSelectedDqRules and trigger parent update
        Object.keys(refined).forEach(tbl => {
          setSelectedDqRules(prev => ({ ...prev, [tbl]: refined[tbl] }));
        });
        // Re-trigger parent state update by calling the prop callback with the refined data
        if (typeof generateDqRules === 'function') {
          generateDqRules(refined);
        }
        setDqFeedback("");
      } else {
        alert("Failed to refine DQ rules.");
      }
    } catch (err) {
      console.error(err);
      alert("Error refining DQ rules.");
    } finally {
      setRefining(false);
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'TECHNICAL': return 'bg-blue-600/20 text-blue-400 border-blue-500/30';
      case 'BUSINESS': return 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30';
      case 'DOMAIN': return 'bg-amber-600/20 text-amber-400 border-amber-500/30';
      case 'CROSS_FIELD': return 'bg-purple-600/20 text-purple-400 border-purple-500/30';
      case 'CROSS_TABLE': return 'bg-pink-600/20 text-pink-400 border-pink-500/30';
      default: return 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch animate-fadeIn">
      {/* Left Column: Table List Selection */}
      <div className="w-full lg:w-64 bg-card border border-accent/30 rounded-xl p-4 flex flex-col justify-start shrink-0">
        <h3 className="text-xs font-mono font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-accent/20 pb-2">
          INGESTED TABLES
        </h3>
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {tables.map((tName) => {
            const isSelected = activeTable === tName;
            const countSelected = (selectedDqRules[tName] || []).length;
            const totalCount = (dqRules[tName] || []).length;
            
            return (
              <button
                key={tName}
                onClick={() => {
                  setActiveTable(tName);
                  setSaveStatus("idle");
                }}
                className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg text-xs font-medium border transition-all min-w-0 ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-textPrimary shadow-sm shadow-primary/5'
                    : 'border-transparent hover:bg-accent/15 text-textSecondary hover:text-textPrimary'
                }`}
              >
                <div className="flex items-center space-x-2 truncate min-w-0 flex-1 mr-2">
                  <Database className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                  <span className="truncate" title={tName}>{tName}</span>
                </div>
                {totalCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    countSelected === totalCount 
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' 
                      : countSelected > 0 
                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {countSelected}/{totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => generateDqRules()}
          disabled={dqLoading}
          className="mt-4 w-full py-2 bg-accent/30 hover:bg-accent/40 text-textSecondary hover:text-textPrimary rounded-lg text-xs font-medium transition-colors border border-accent/20 flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${dqLoading ? 'animate-spin' : ''}`} />
          Suggest Again
        </button>
      </div>

      {/* Center Column: Rules Grid */}
      <div className="flex-1 bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300 overflow-y-auto max-h-[650px] lg:max-h-none">
        {dqLoading ? (
          <div className="flex-1 flex items-center justify-center flex-col space-y-4 py-20">
            <RefreshCw className="w-12 h-12 text-primary animate-spin" />
            <span className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is generating Data Quality rules...</span>
          </div>
        ) : rulesForActiveTable.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col py-20 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-zinc-500" />
            <span className="text-sm font-semibold text-textSecondary">No rules suggested yet for this table.</span>
            <button 
              onClick={() => generateDqRules()}
              className="py-1.5 px-3 bg-primary hover:bg-primaryHover text-white text-xs font-medium rounded-lg transition-colors"
            >
              Generate Rules
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-accent/20 pb-3 mb-4">
                <div>
                  <span className="text-xs font-mono text-textSecondary uppercase tracking-wider block">SUGGESTED DATA QUALITY RULES</span>
                  <span className="text-[10px] text-textSecondary font-mono">{activeTable}</span>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-mono text-primary hover:underline"
                >
                  {(selectedDqRules[activeTable] || []).length === rulesForActiveTable.length ? "DESELECT ALL" : "SELECT ALL"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-accent/20 text-textSecondary text-[10px] font-mono uppercase">
                      <th className="py-2.5 px-2 w-10">Select</th>
                      <th className="py-2.5 px-3 w-40">Rule Name</th>
                      <th className="py-2.5 px-3 w-28">Category</th>
                      <th className="py-2.5 px-3 w-36">Column / Table Ref</th>
                      <th className="py-2.5 px-3 w-60">Description</th>
                      <th className="py-2.5 px-3">Failure Condition (SQL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rulesForActiveTable.map((rule, idx) => {
                      if (rule.error) {
                        return (
                          <tr key={idx} className="border-b border-accent/15 text-xs text-rose-400 bg-rose-500/10">
                            <td colSpan={6} className="py-4 px-4 font-mono text-center">
                              Error generating rules: {rule.error}
                            </td>
                          </tr>
                        );
                      }
                      
                      const isSelected = (selectedDqRules[activeTable] || []).some(r => r.rule_name === rule.rule_name);
                      
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => handleToggleRule(rule)}
                          className={`border-b border-accent/10 hover:bg-accent/5 transition-colors cursor-pointer text-xs ${
                            isSelected ? 'bg-primary/5 text-textPrimary' : 'text-textSecondary'
                          }`}
                        >
                          <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleToggleRule(rule)}
                              className="w-3.5 h-3.5 accent-primary bg-background border border-accent/30 rounded focus:ring-0 focus:ring-offset-0"
                            />
                          </td>
                          <td className="py-3 px-3 font-semibold font-mono text-textPrimary">{rule.rule_name}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getCategoryBadgeClass(rule.rule_category)}`}>
                              {rule.rule_category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <div>{rule.column_name}</div>
                            {rule.referenced_table && (
                              <div className="text-[10px] text-pink-400 mt-0.5 font-sans font-semibold">Ref: {rule.referenced_table}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 leading-relaxed">{rule.description}</td>
                          <td className="py-3 px-3 font-mono text-[10px] text-pink-400 bg-black/20 rounded p-1.5 m-1 block max-h-16 overflow-y-auto whitespace-pre-wrap">
                            {rule.sql_condition}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feedback & Regenerate */}
            <div className="mt-6 pt-5 border-t border-accent/20">
              <p className="text-xs font-mono text-textSecondary uppercase tracking-wider mb-2">💬 Give Feedback to Regenerate</p>
              <div className="flex gap-2 items-start">
                <textarea
                  value={dqFeedback}
                  onChange={(e) => setDqFeedback(e.target.value)}
                  placeholder="e.g. Remove all LOW severity rules, add referential integrity check for customer_id..."
                  rows={2}
                  className="flex-1 bg-background border border-accent/30 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder-textSecondary/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={handleRefineDqRules}
                  disabled={refining || !dqFeedback.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refining ? 'animate-spin' : ''}`} />
                  {refining ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-accent/20 flex items-center justify-between">
              <button 
                onClick={() => setStep(10)}
                className="py-2.5 px-5 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary text-xs font-semibold transition-colors"
              >
                Back to DFD
              </button>

              <button 
                onClick={handleSaveAndProceed}
                disabled={dqLoading || Object.keys(selectedDqRules).length === 0}
                className="py-2.5 px-6 bg-primary hover:bg-primaryHover text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
              >
                {saveStatus === "saving" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving DQ Rules...
                  </>
                ) : saveStatus === "success" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Saved Successfully!
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve DQ Rules & Proceed
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
