import React from 'react';
import { Database, RefreshCw, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';

export default function Step2Preview({
  selectedItems,
  activeTableForColCtx,
  setActiveTableForColCtx,
  previewLoading,
  previewData,
  fetchPreview,
  setStep
}) {
  return (
    <div className="flex-1 flex flex-col bg-card border border-accent/30 rounded-xl p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Source Preview & Schema Details
          </h2>
          <p className="text-sm text-textSecondary">Verify that structural columns and mock record datasets are correctly ingested.</p>
        </div>
        <button 
          onClick={fetchPreview}
          className="p-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-colors flex items-center gap-1.5 text-xs font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Preview
        </button>
      </div>

      {/* Split Preview Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[300px]">
        {/* Tables list / Switcher */}
        <div className="border-r border-accent/20 pr-4 space-y-2">
          <span className="text-xs font-mono text-textSecondary block uppercase tracking-wider mb-2">Ingested Tables</span>
          {selectedItems.map((table) => (
            <button
              key={table}
              onClick={() => setActiveTableForColCtx(table)}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between border transition-all min-w-0 ${
                activeTableForColCtx === table 
                  ? 'border-primary bg-primary/5 text-primary font-medium shadow shadow-primary/10' 
                  : 'border-accent/20 hover:border-accent text-textSecondary'
              }`}
            >
              <span className="font-mono text-xs truncate mr-2 flex-1" title={table}>{table}</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>

        {/* Table Data Preview & Schema details */}
        <div className="lg:col-span-2 flex flex-col space-y-6 overflow-x-auto">
          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center flex-col space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm font-mono text-textSecondary">Loading previews...</span>
            </div>
          ) : !activeTableForColCtx || !previewData[activeTableForColCtx] ? (
            <div className="flex-1 flex items-center justify-center text-textSecondary">
              Select a table to view schemas and sample rows.
            </div>
          ) : (
            <>
              {/* Schema Panel */}
              <div className="bg-background rounded-lg border border-accent/30 p-4">
                <h3 className="text-xs font-mono text-textSecondary uppercase tracking-wider mb-3">
                  Extracted Schema ({activeTableForColCtx}) 
                  {previewData[activeTableForColCtx].file_format && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-normal border border-primary/20">
                      Format: {previewData[activeTableForColCtx].file_format}
                    </span>
                  )}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-accent pb-2 text-textSecondary">
                        <th className="py-2">Column Name</th>
                        <th className="py-2">Data Type</th>
                        <th className="py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData[activeTableForColCtx].schema.map((col) => (
                        <tr key={col.name} className="border-b border-accent/20">
                          <td className="py-2 font-bold text-textPrimary">{col.name}</td>
                          <td className="py-2 text-primary">{col.type}</td>
                          <td className="py-2 text-textSecondary">{col.description || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-background rounded-lg border border-accent/30 p-4 overflow-y-auto max-h-[300px]">
                <h3 className="text-xs font-mono text-textSecondary uppercase tracking-wider mb-3">Top 5 Records Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-accent pb-2 text-textSecondary">
                        {previewData[activeTableForColCtx].schema.map((col) => (
                          <th key={col.name} className="py-2 px-3">{col.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData[activeTableForColCtx].preview.map((row, idx) => (
                        <tr key={idx} className="border-b border-accent/20 hover:bg-accent/10">
                          {previewData[activeTableForColCtx].schema.map((col) => (
                            <td key={col.name} className="py-2 px-3 text-textSecondary truncate max-w-[150px]">
                              {row[col.name] !== undefined ? String(row[col.name]) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nav controls */}
      <div className="flex justify-between items-center mt-8 pt-4 border-t border-accent/20">
        <button 
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button 
          onClick={() => setStep(3)}
          className="px-6 py-3 rounded-lg bg-primary hover:bg-primaryHover text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          Add Context & Goals
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
