import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Check, Play, AlertCircle } from 'lucide-react';

export default function Step7Anomalies({
  projectId,
  anomalyLoading,
  anomalyRules,
  generateAnomalyRules,
  saveAnomalyRules,
  selectedAnomalyRules,
  setSelectedAnomalyRules,
  onNext,
  onPrev,
  tables
}) {
  // Parse tables if it comes as a JSON string
  const tablesList = typeof tables === 'string' ? JSON.parse(tables) : (tables || []);
  const [activeTable, setActiveTable] = useState("");
  const [rulesForActiveTable, setRulesForActiveTable] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [execResults, setExecResults] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, success, error
  const [anomalyFeedback, setAnomalyFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    if (tablesList.length > 0 && !activeTable) {
      setActiveTable(tablesList[0]);
    }
  }, [tablesList, activeTable]);

  // Auto suggest on load if empty
  useEffect(() => {
    if ((!anomalyRules || Object.keys(anomalyRules).length === 0) && !anomalyLoading && projectId) {
      generateAnomalyRules();
    }
  }, [anomalyRules, anomalyLoading, projectId, generateAnomalyRules]);

  // Load rules and initialize selected rules for the active table
  useEffect(() => {
    if (anomalyRules && activeTable && anomalyRules[activeTable]) {
      setRulesForActiveTable(anomalyRules[activeTable]);
      
      // If no selections exist for this table yet, select all by default
      if (!selectedAnomalyRules[activeTable]) {
        setSelectedAnomalyRules(prev => ({
          ...prev,
          [activeTable]: anomalyRules[activeTable]
        }));
      }
    } else {
      setRulesForActiveTable([]);
    }
  }, [anomalyRules, activeTable, selectedAnomalyRules, setSelectedAnomalyRules]);

  const handleToggleRule = (rule) => {
    const activeSelections = selectedAnomalyRules[activeTable] || [];
    const isSelected = activeSelections.some(r => r.anomaly_name === rule.anomaly_name);
    
    let newSelections;
    if (isSelected) {
      newSelections = activeSelections.filter(r => r.anomaly_name !== rule.anomaly_name);
    } else {
      newSelections = [...activeSelections, rule];
    }
    
    setSelectedAnomalyRules(prev => ({
      ...prev,
      [activeTable]: newSelections
    }));
  };

  const handleSelectAll = () => {
    const activeSelections = selectedAnomalyRules[activeTable] || [];
    const allSelected = activeSelections.length === rulesForActiveTable.length;
    
    setSelectedAnomalyRules(prev => ({
      ...prev,
      [activeTable]: allSelected ? [] : [...rulesForActiveTable]
    }));
  };

  const saveAndProceed = async () => {
    setSaveStatus("saving");
    try {
      await saveAnomalyRules(selectedAnomalyRules);
      setSaveStatus("success");
      setTimeout(() => {
        onNext();
      }, 800);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const runAnomalyExecution = async () => {
    setExecuting(true);
    setExecResults([]);
    try {
      const res = await fetch('/api/execute-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (res.ok) {
        const data = await res.json();
        setExecResults(data.results || []);
      } else {
        alert("Failed to execute anomalies.");
      }
    } catch (err) {
      console.error(err);
      alert("Error running anomaly checks.");
    } finally {
      setExecuting(false);
    }
  };

  const handleRefineAnomalies = async () => {
    if (!anomalyFeedback.trim()) return;
    setRefining(true);
    try {
      const res = await fetch('/api/refine-anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: anomalyFeedback,
          existing_anomalies: anomalyRules
        })
      });
      if (res.ok) {
        const refined = await res.json();
        Object.keys(refined).forEach(tbl => {
          setSelectedAnomalyRules(prev => ({ ...prev, [tbl]: refined[tbl] }));
        });
        if (typeof generateAnomalyRules === 'function') {
          generateAnomalyRules(refined);
        }
        setAnomalyFeedback("");
      } else {
        alert("Failed to refine anomalies.");
      }
    } catch (err) {
      console.error(err);
      alert("Error refining anomalies.");
    } finally {
      setRefining(false);
    }
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'HIGH': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'MEDIUM': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn text-left">
      {execResults.length > 0 && (
        <div className="bg-card border border-accent/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Test Run Execution Metrics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-gray-300">
              <thead>
                <tr className="border-b border-accent/20 text-[10px] font-mono uppercase text-gray-400">
                  <th className="py-2 px-3">Table</th>
                  <th className="py-2 px-3">Anomaly Rule</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Prev Run Metric</th>
                  <th className="py-2 px-3 text-right">Current Run Metric</th>
                  <th className="py-2 px-3 text-right">Drift %</th>
                </tr>
              </thead>
              <tbody>
                {execResults.map((res, idx) => {
                  const isDrift = res.change_pct !== null && Math.abs(res.change_pct) > 15;
                  return (
                    <tr key={idx} className="border-b border-accent/10 hover:bg-accent/5">
                      <td className="py-2.5 px-3 font-mono text-zinc-500">{res.table_name}</td>
                      <td className="py-2.5 px-3 text-zinc-200 font-semibold">{res.anomaly_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${
                          res.status === 'executed' 
                            ? (isDrift ? 'bg-rose-500/25 text-rose-300' : 'bg-emerald-500/25 text-emerald-300')
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {res.status === 'executed' ? (isDrift ? 'DRIFTED' : 'PASS') : res.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-right text-zinc-400">{res.previous_value !== null ? Number(res.previous_value).toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-zinc-200">{res.current_value !== null ? Number(res.current_value).toFixed(2) : '-'}</td>
                      <td className={`py-2.5 px-3 font-mono font-bold text-right ${isDrift ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {res.change_pct !== null ? `${Number(res.change_pct).toFixed(2)}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Two Column Selector Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Column: Tables List */}
        <div className="w-full lg:w-64 bg-card border border-accent/30 rounded-xl p-4 flex flex-col justify-start shrink-0">
          <h3 className="text-xs font-mono font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-accent/20 pb-2">
            SELECT TABLE
          </h3>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {tablesList.map((tName) => {
              const isSelected = activeTable === tName;
              const countSelected = (selectedAnomalyRules[tName] || []).length;
              const totalCount = (anomalyRules[tName] || []).length;

              return (
                <button
                  key={tName}
                  onClick={() => {
                    setActiveTable(tName);
                    setSaveStatus('idle');
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
                          : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {countSelected}/{totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={generateAnomalyRules}
            disabled={anomalyLoading}
            className="mt-4 w-full py-2 bg-accent/30 hover:bg-accent/40 text-textSecondary hover:text-textPrimary rounded-lg text-xs font-medium transition-colors border border-accent/20 flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${anomalyLoading ? 'animate-spin' : ''}`} />
            Suggest Again
          </button>
        </div>

        {/* Right Column: Suggested Rules */}
        <div className="flex-1 bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300 overflow-y-auto max-h-[650px] lg:max-h-none">
          {anomalyLoading ? (
            <div className="flex-1 flex items-center justify-center flex-col space-y-4 py-20">
              <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              <span className="text-sm font-mono text-textSecondary animate-pulse">AI Agent is generating Anomaly Rules...</span>
            </div>
          ) : rulesForActiveTable.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col py-20 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-zinc-500" />
              <span className="text-sm font-semibold text-textSecondary">No anomalies suggested yet for this table.</span>
              <button 
                onClick={generateAnomalyRules}
                className="py-1.5 px-3 bg-primary hover:bg-primaryHover text-white text-xs font-medium rounded-lg transition-colors"
              >
                Generate Anomalies
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-accent/20 pb-3 mb-4">
                  <div>
                    <span className="text-xs font-mono text-textSecondary uppercase tracking-wider block">SUGGESTED ANOMALY RULES</span>
                    <span className="text-[10px] text-textSecondary font-mono">{activeTable}</span>
                  </div>
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] font-mono text-primary hover:underline"
                  >
                    {(selectedAnomalyRules[activeTable] || []).length === rulesForActiveTable.length ? "DESELECT ALL" : "SELECT ALL"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-accent/20 text-textSecondary text-[10px] font-mono uppercase">
                        <th className="py-2.5 px-2 w-10">Select</th>
                        <th className="py-2.5 px-3 w-44">Rule Name</th>
                        <th className="py-2.5 px-3 w-24">Severity</th>
                        <th className="py-2.5 px-3 w-28">Category</th>
                        <th className="py-2.5 px-3 w-60">Description</th>
                        <th className="py-2.5 px-3">Failure Trigger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rulesForActiveTable.map((rule, idx) => {
                        const isSelected = (selectedAnomalyRules[activeTable] || []).some(r => r.anomaly_name === rule.anomaly_name);

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
                            <td className="py-3 px-3 font-semibold font-mono text-textPrimary">{rule.anomaly_name}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getSeverityBadgeClass(rule.severity)}`}>
                                {rule.severity}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-zinc-500">{rule.anomaly_category}</td>
                            <td className="py-3 px-3 leading-relaxed">{rule.description}</td>
                            <td className="py-3 px-3">
                              <div className="font-mono text-[9px] text-pink-400 bg-black/20 rounded p-1.5 mb-1 max-h-16 overflow-y-auto whitespace-pre-wrap">
                                {rule.sql_condition}
                              </div>
                              {isSelected && (
                                <details className="mt-1" onClick={(e) => e.stopPropagation()}>
                                  <summary className="text-[10px] text-primary cursor-pointer select-none">Show SQL Template</summary>
                                  <pre className="mt-1 p-2 bg-black/40 border border-accent/10 rounded font-mono text-[9px] text-zinc-400 overflow-x-auto">
                                    {rule.compiled_sql}
                                  </pre>
                                </details>
                              )}
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
                    value={anomalyFeedback}
                    onChange={(e) => setAnomalyFeedback(e.target.value)}
                    placeholder="e.g. Remove all LOW severity anomalies, add COUNT anomaly for clicks column..."
                    rows={2}
                    className="flex-1 bg-background border border-accent/30 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder-textSecondary/50 resize-none focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleRefineAnomalies}
                    disabled={refining || !anomalyFeedback.trim()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refining ? 'animate-spin' : ''}`} />
                    {refining ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-accent/20 mt-6">
                <button
                  onClick={onPrev}
                  className="px-5 py-2 rounded-lg border border-accent/30 text-textSecondary hover:text-textPrimary hover:bg-accent/10 transition-colors text-xs font-medium"
                >
                  Back
                </button>
                <button
                  onClick={saveAndProceed}
                  disabled={saveStatus === 'saving'}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-colors ${
                    saveStatus === 'saving'
                      ? 'bg-emerald-600/50 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {saveStatus === 'saving' ? "Saving..." : "Approve & Next"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
