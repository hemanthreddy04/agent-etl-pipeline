import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Code, Play, RefreshCw, AlertCircle, FileCode } from 'lucide-react';


export default function Step15Bronze({ projectId, setStep }) {
  const [generatedFiles, setGeneratedFiles] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('config.yaml');

  useEffect(() => {
    if (!projectId) return;
    const fetchArtifacts = async () => {
      try {
        const res = await fetch(`/api/fetch-bronze-artifacts?project_id=${projectId}`);
        const data = await res.json();
        if (data.status === 'success' && data.artifacts) {
           const files = {
             "config.yaml": data.artifacts.yaml_config,
             "config_loader.py": data.artifacts.loader_code,
             "file_reader.py": data.artifacts.reader_code,
             "bronze_processor.py": data.artifacts.orchestrator_code,
             "bronze_pipeline.py": data.artifacts.pipeline_code,
             "alert.py": data.artifacts.alert_code,
             "requirements.txt": data.artifacts.requirements_code
           };
           // Only set if at least one file is actually not empty/placeholder
           if (Object.values(files).some(v => v && !v.includes("Placeholder for"))) {
               setGeneratedFiles(files);
           }
        }
      } catch (err) {
        console.error("Failed to fetch initial artifacts:", err);
      }
    };
    fetchArtifacts();
  }, [projectId]);

  const generatePipeline = async () => {
    setLoading(true);
    setSaveStatus(null);
    setError('');
    setGeneratedFiles(null);
    try {
      // The backend agent generates all files at once
      const res = await fetch(`/api/generate-bronze-yaml?project_id=${projectId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to generate Bronze Pipeline');
      }
      const data = await res.json(); 
      
      // Clean up the keys to just basenames for the tabs
      const filesMap = {};
      for (const [filepath, content] of Object.entries(data)) {
         const basename = filepath.split('/').pop();
         filesMap[basename] = content;
      }
      
      setGeneratedFiles(filesMap);
      if (Object.keys(filesMap).length > 0) {
        setActiveTab(Object.keys(filesMap)[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToGcs = async () => {
    if (!generatedFiles) return;
    setSaveStatus('saving');
    try {
      // Map back to correct paths
      const filePaths = {
        "config.yaml": "config/config.yaml",
        "config_loader.py": "src/utils/config_loader.py",
        "file_reader.py": "src/readers/file_reader.py",
        "bronze_processor.py": "src/bronze/bronze_processor.py",
        "bronze_pipeline.py": "pipelines/bronze_pipeline.py",
        "alert.py": "src/utils/alert.py"
      };
      
      const payloadFiles = {};
      for (const [basename, content] of Object.entries(generatedFiles)) {
         const fullPath = filePaths[basename] || basename;
         payloadFiles[fullPath] = content;
      }
      
      const res = await fetch('/api/save-bronze-all-to-gcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, files: payloadFiles })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save to GCS');
      }
      setSaveStatus('success');
    } catch (err) {
      setSaveStatus('error');
      setError(err.message);
    }
  };
  
  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn pb-10">
      
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-500" />
                Bronze Pipeline Generator
              </h2>
              <p className="text-sm text-textSecondary">
                Dynamically generate the full ETL Bronze pipeline (Config, Loader, Reader, Orchestrator, Main Pipeline, Alert Module) using our AI agent.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(11)}
                className="px-4 py-2 text-sm bg-accent/20 hover:bg-accent/40 border border-accent/50 rounded-lg text-textSecondary transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(16)}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-lg text-white transition-colors flex items-center gap-2 shadow-sm hover:shadow-indigo-500/20"
              >
                Next Step: STTM (Bronze to Silver)
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-2 items-center">
            <button
              onClick={generatePipeline}
              disabled={loading}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                loading ? 'bg-primary/50 text-white/70 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? 'Generating Pipeline...' : 'Generate Bronze Pipeline'}
            </button>
            
            {generatedFiles && (
              <button
                onClick={saveToGcs}
                disabled={saveStatus === 'saving' || saveStatus === 'success'}
                className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  saveStatus === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : saveStatus === 'saving'
                    ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {saveStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Uploaded to GCS
                  </>
                ) : saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  'Save All to GCS'
                )}
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error</span>
                {error}
              </div>
            </div>
          )}
          
          {loading && (
             <div className="flex justify-center items-center py-20 text-zinc-400 flex-col gap-3">
                 <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                 <p>Agent is designing the architecture and generating all files...</p>
             </div>
          )}

          {generatedFiles && !loading && (
            <div className="flex flex-col gap-0 border border-zinc-700/50 rounded-xl overflow-hidden mt-4">
              <div className="flex overflow-x-auto bg-[#1a1a1a] border-b border-zinc-700/50">
                {Object.keys(generatedFiles).map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setActiveTab(filename)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex gap-2 items-center border-r border-zinc-700/50 ${
                      activeTab === filename 
                        ? 'bg-[#1e1e1e] text-blue-400 border-b-2 border-b-blue-500' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252525]'
                    }`}
                  >
                    <FileCode className="w-4 h-4" />
                    {filename}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 bg-[#1e1e1e]">
                <pre className="w-full h-full min-h-[500px] max-h-[700px] p-6 overflow-auto text-zinc-300 font-mono text-sm leading-relaxed">
                  <code>{generatedFiles[activeTab] || 'No content generated.'}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
