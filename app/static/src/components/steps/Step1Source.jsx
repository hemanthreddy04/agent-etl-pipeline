import React from 'react';
import { Database, Folder, FileSpreadsheet, Check, ArrowRight } from 'lucide-react';

export default function Step1Source({
  sourceType,
  setSourceType,
  selectedPath,
  setSelectedPath,
  availablePaths,
  availableItems,
  selectedItems,
  handleTableSelect,
  handleNextToStep2
}) {
  const toggleSourceType = (src) => {
    if (sourceType.includes(src)) {
      if (sourceType.length > 1) {
        setSourceType(sourceType.filter(s => s !== src));
      }
    } else {
      setSourceType([...sourceType, src]);
    }
  };

  const totalSelectedCount = Object.values(selectedItems).reduce((sum, list) => sum + (list || []).length, 0);

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 items-stretch animate-fadeIn">
      {/* Column 1: Source Settings */}
      <div className="flex-1 bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Configure Data Source
            </h2>
            <p className="text-sm text-textSecondary">Select the cloud storage engines holding your raw records. You can select both.</p>
          </div>

          {/* Source Type Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => toggleSourceType('BigQuery')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 ${
                sourceType.includes('BigQuery') 
                  ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5' 
                  : 'border-accent/40 bg-background text-textSecondary hover:border-accent'
              }`}
            >
              <Database className="w-8 h-8" />
              <span className="font-medium text-sm">BigQuery</span>
            </button>

            <button 
              onClick={() => toggleSourceType('GCS')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 ${
                sourceType.includes('GCS') 
                  ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5' 
                  : 'border-accent/40 bg-background text-textSecondary hover:border-accent'
              }`}
            >
              <Folder className="w-8 h-8" />
              <span className="font-medium text-sm">Cloud Storage</span>
            </button>
          </div>

          {/* Config lists for active sources */}
          <div className="space-y-4">
            {sourceType.includes('BigQuery') && (
              <div className="space-y-2">
                <label className="text-xs font-mono text-textSecondary block flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  BigQuery Dataset Target
                </label>
                <select 
                  value={selectedPath.BigQuery || ''}
                  onChange={(e) => setSelectedPath(prev => ({ ...prev, BigQuery: e.target.value }))}
                  className="w-full bg-background border border-accent/40 rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  {(availablePaths.BigQuery || []).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {sourceType.includes('GCS') && (
              <div className="space-y-2">
                <label className="text-xs font-mono text-textSecondary block flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  Cloud Storage Bucket Name
                </label>
                <select 
                  value={selectedPath.GCS || ''}
                  onChange={(e) => setSelectedPath(prev => ({ ...prev, GCS: e.target.value }))}
                  className="w-full bg-background border border-accent/40 rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                >
                  {(availablePaths.GCS || []).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-accent/20 flex justify-between items-center">
          <span className="text-xs text-textSecondary font-mono">Select tables or files on the next card</span>
        </div>
      </div>

      {/* Column 2: Table Selection */}
      <div className="flex-1 bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-6 flex-1 flex flex-col overflow-hidden">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Select Targets
            </h2>
            <p className="text-sm text-textSecondary">
              Choose the tables and files to feed into the pipeline.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {sourceType.includes('BigQuery') && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-textSecondary uppercase tracking-wider border-b border-accent/25 pb-1 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  BigQuery Tables ({selectedPath.BigQuery})
                </div>
                {(availableItems.BigQuery || []).length === 0 ? (
                  <div className="py-4 text-center text-xs font-mono text-zinc-500">No tables discovered</div>
                ) : (
                  (availableItems.BigQuery || []).map((item) => {
                    const isSelected = (selectedItems.BigQuery || []).includes(item);
                    return (
                      <div 
                        key={`bq-${item}`}
                        onClick={() => handleTableSelect(item, 'BigQuery')}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary/60 bg-primary/5 text-textPrimary' 
                            : 'border-accent/20 bg-background/50 text-textSecondary hover:border-accent hover:text-textPrimary'
                        }`}
                      >
                        <span className="text-sm font-mono">{item}</span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-accent/40 bg-background'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {sourceType.includes('GCS') && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-mono text-textSecondary uppercase tracking-wider border-b border-accent/25 pb-1 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  GCS Files / Folders ({selectedPath.GCS})
                </div>
                {(availableItems.GCS || []).length === 0 ? (
                  <div className="py-4 text-center text-xs font-mono text-zinc-500">No files discovered</div>
                ) : (
                  (availableItems.GCS || []).map((item) => {
                    const isSelected = (selectedItems.GCS || []).includes(item);
                    return (
                      <div 
                        key={`gcs-${item}`}
                        onClick={() => handleTableSelect(item, 'GCS')}
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary/60 bg-primary/5 text-textPrimary' 
                            : 'border-accent/20 bg-background/50 text-textSecondary hover:border-accent hover:text-textPrimary'
                        }`}
                      >
                        <span className="text-sm font-mono">{item}</span>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-accent/40 bg-background'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            disabled={totalSelectedCount === 0}
            onClick={handleNextToStep2}
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primaryHover text-white font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            Confirm and Preview
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
