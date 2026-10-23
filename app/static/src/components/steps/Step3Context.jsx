import React from 'react';
import { FileText, Upload, Info, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';

export default function Step3Context({
  finalGoal,
  setFinalGoal,
  businessContext,
  setBusinessContext,
  uploadedFiles,
  uploading,
  handleFileUpload,
  activeTableForColCtx,
  setActiveTableForColCtx,
  selectedItems,
  previewData,
  previewLoading,
  columnContext,
  handleColumnContextChange,
  fetchPreview,
  generateAIBluePrint,
  setStep
}) {
  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn">
      {/* Top: General Business Context & Goal */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Business Context & Pipeline Goal
            </h2>
            <p className="text-sm text-textSecondary">Provide guidelines, business definitions, and target KPIs the pipeline must deliver.</p>
          </div>

          {/* Pipeline Target / Goal Description */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-primary font-bold uppercase tracking-wider block">
              Calculated KPIs (Required)
            </label>
            <textarea 
              value={finalGoal}
              onChange={(e) => setFinalGoal(e.target.value)}
              placeholder="e.g. Calculate Monthly Active Users (MAU) and Average Order Value (AOV) for completed orders, outputting the aggregates in a target table 'sales_analytics.monthly_kpi_dashboard'."
              rows={4}
              className="w-full bg-background border border-primary/40 rounded-lg p-3 text-sm text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-sans"
            />
          </div>

          {/* File Ingestion & Business Notes side-by-side or stacked */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Dropzone */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-textSecondary uppercase tracking-wider block">
                2. Ingest Business Context Document (Optional)
              </label>
              <div className="border border-dashed border-accent/40 rounded-lg p-4 bg-background flex flex-col items-center justify-center relative hover:border-accent transition-colors h-[116px]">
                <Upload className="w-6 h-6 text-textSecondary mb-2" />
                <span className="text-xs text-textSecondary mb-1 text-center">Upload PDF, TXT, or Excel guidelines</span>
                <input 
                  type="file" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {uploading && <span className="text-xs text-primary font-mono animate-pulse">Parsing file...</span>}
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadedFiles.map((file, fIdx) => (
                    <div key={fIdx} className="p-2 bg-accent/20 rounded flex justify-between items-center text-xs font-mono text-textSecondary">
                      <span>{file.name}</span>
                      <span>{file.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Context Text Area */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-textSecondary uppercase tracking-wider block">
                3. Business Context Notes & Instructions
              </label>
              <textarea 
                value={businessContext}
                onChange={(e) => setBusinessContext(e.target.value)}
                placeholder="Provide context rules here (or verified parsed document files content)..."
                rows={4}
                className="w-full bg-background border border-accent/40 rounded-lg p-3 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors resize-none h-[116px]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-accent/20">
          <button 
            onClick={() => setStep(2)}
            className="px-4 py-2 border border-accent/40 rounded-lg hover:border-accent text-textSecondary hover:text-textPrimary transition-all flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Bottom: Column specific descriptions selector */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between hover:border-accent transition-colors duration-300">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Column Context Annotations
              </h2>
              <p className="text-sm text-textSecondary">Annotate specific columns to clarify formulas, custom IDs, or status descriptions.</p>
            </div>
            
            {/* Context-aware suggestions generator */}
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-2.5 shrink-0">
              <div className="text-xs text-textSecondary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="hidden sm:inline">Generate suggestions using Business Context</span>
              </div>
              <button
                onClick={() => fetchPreview(businessContext)}
                disabled={previewLoading || !businessContext.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primaryHover text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {previewLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Suggest</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Table selector for column details */}
          <div className="flex flex-wrap gap-2 border-b border-accent/30 pb-3">
            {selectedItems.map((table) => (
              <button
                key={table}
                onClick={() => setActiveTableForColCtx(table)}
                className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeTableForColCtx === table 
                    ? 'bg-primary text-white border border-primary shadow-lg shadow-primary/30 scale-[1.02]' 
                    : 'bg-[#1e1e24] border border-accent/30 text-textPrimary hover:bg-accent/15 hover:text-white'
                }`}
              >
                {table}
              </button>
            ))}
          </div>

          {/* List of fields in active table to assign custom description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] pr-2 pt-2">
            {activeTableForColCtx && previewData[activeTableForColCtx] ? (
              previewData[activeTableForColCtx].schema.map((col) => (
                <div key={col.name} className="p-4 bg-background/50 border border-accent/20 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-accent/10 pb-1.5">
                      <span className="text-sm font-mono font-bold text-textPrimary truncate mr-2" title={col.name}>
                        {col.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[9px] font-mono uppercase shrink-0">
                        {col.type}
                      </span>
                    </div>

                    {col.description && (
                      <div className="bg-accent/5 border-l-2 border-primary/40 pl-3 py-1.5 text-xs text-textSecondary">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block mb-0.5">AI Suggestion</span>
                        <p className="leading-relaxed">{col.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block">Custom Annotations</label>
                    <input 
                      type="text"
                      value={columnContext[activeTableForColCtx]?.[col.name] || ''}
                      onChange={(e) => handleColumnContextChange(activeTableForColCtx, col.name, e.target.value)}
                      placeholder={`e.g. Documentation detail for ${col.name}`}
                      className="w-full bg-background border border-accent/40 rounded-lg p-2.5 text-xs text-textPrimary placeholder:text-textSecondary/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-textSecondary font-mono text-xs">
                No schema preview data found.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-accent/20">
          <button
            disabled={!finalGoal.trim()}
            onClick={generateAIBluePrint}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primaryHover hover:to-purple-700 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 glow-primary"
          >
            Generate Blueprint
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
