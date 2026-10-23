import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Code, Play, RefreshCw, AlertCircle, FileCode } from 'lucide-react';

export default function Step16Silver({ projectId, setStep }) {
  const [yamlConfig, setYamlConfig] = useState('');
  const [loadingYaml, setLoadingYaml] = useState(false);
  const [saveYamlStatus, setSaveYamlStatus] = useState(null);
  const [errorYaml, setErrorYaml] = useState('');

  const [orchestratorCode, setOrchestratorCode] = useState('');
  const [loadingOrchestrator, setLoadingOrchestrator] = useState(false);
  const [saveOrchestratorStatus, setSaveOrchestratorStatus] = useState(null);
  const [errorOrchestrator, setErrorOrchestrator] = useState('');

  const [pipelineCode, setPipelineCode] = useState('');
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [savePipelineStatus, setSavePipelineStatus] = useState(null);
  const [errorPipeline, setErrorPipeline] = useState('');

  const [isFetchingInitial, setIsFetchingInitial] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    
    const fetchArtifacts = async () => {
      try {
        const res = await fetch(`/api/fetch-silver-artifacts?project_id=${projectId}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.artifacts) {
          if (data.artifacts.yaml_config) setYamlConfig(data.artifacts.yaml_config);
          if (data.artifacts.orchestrator_code) setOrchestratorCode(data.artifacts.orchestrator_code);
          if (data.artifacts.pipeline_code) setPipelineCode(data.artifacts.pipeline_code);
        }
      } catch (err) {
        console.error("Failed to fetch initial artifacts:", err);
      } finally {
        setIsFetchingInitial(false);
      }
    };
    
    fetchArtifacts();
  }, [projectId]);

  const generateSilverYaml = async () => {
    if (!yamlConfig) {
        setErrorYaml('No existing YAML config found. Please ensure it is generated in previous steps.');
        return;
    }

    setLoadingYaml(true);
    setSaveYamlStatus(null);
    setErrorYaml('');
    try {
      const res = await fetch('/api/generate-silver-yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yaml_content: yamlConfig })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to generate Silver YAML transformations');
      }
      const data = await res.json();
      setYamlConfig(data.yaml);
    } catch (err) {
      setErrorYaml(err.message);
    } finally {
      setLoadingYaml(false);
    }
  };

  const saveYamlToGcs = async () => {
    setSaveYamlStatus('saving');
    try {
      const res = await fetch('/api/save-config-to-gcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yaml_content: yamlConfig })
      });
      if (!res.ok) throw new Error('Failed to save to GCS');
      setSaveYamlStatus('success');
      setTimeout(() => setSaveYamlStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveYamlStatus('error');
    }
  };

  const generateOrchestrator = async () => {
    if (!yamlConfig) {
      setErrorOrchestrator('Please generate YAML configuration first.');
      return;
    }
    setLoadingOrchestrator(true);
    setSaveOrchestratorStatus(null);
    setErrorOrchestrator('');
    try {
      const res = await fetch('/api/generate-silver-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yaml_content: yamlConfig })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to generate Silver Orchestrator script');
      }
      const data = await res.json();
      setOrchestratorCode(data.python_code);
    } catch (err) {
      setErrorOrchestrator(err.message);
    } finally {
      setLoadingOrchestrator(false);
    }
  };

  const saveOrchestratorToGcs = async () => {
    setSaveOrchestratorStatus('saving');
    try {
      const res = await fetch('/api/save-silver-orchestrator-to-gcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, python_code: orchestratorCode })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save Silver Orchestrator to GCS');
      }
      setSaveOrchestratorStatus('success');
      setTimeout(() => setSaveOrchestratorStatus(null), 3000);
    } catch (err) {
      setSaveOrchestratorStatus('error');
      setErrorOrchestrator(err.message);
    }
  };

  const generatePipeline = async () => {
    if (!yamlConfig) {
      setErrorPipeline('Please generate YAML configuration first.');
      return;
    }
    setLoadingPipeline(true);
    setSavePipelineStatus(null);
    setErrorPipeline('');
    try {
      const res = await fetch('/api/generate-silver-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, yaml_content: yamlConfig })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to generate Silver Pipeline script');
      }
      const data = await res.json();
      setPipelineCode(data.python_code);
    } catch (err) {
      setErrorPipeline(err.message);
    } finally {
      setLoadingPipeline(false);
    }
  };

  const savePipelineToGcs = async () => {
    setSavePipelineStatus('saving');
    try {
      const res = await fetch('/api/save-silver-pipeline-to-gcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, python_code: pipelineCode })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save Silver Pipeline to GCS');
      }
      setSavePipelineStatus('success');
      setTimeout(() => setSavePipelineStatus(null), 3000);
    } catch (err) {
      setSavePipelineStatus('error');
      setErrorPipeline(err.message);
    }
  };

  if (isFetchingInitial) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-3 text-lg">Loading Silver context...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn pb-10">
      
      {/* SECTION 1: YAML */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Code className="w-5 h-5 text-emerald-500" />
                Silver Transformations (YAML)
              </h2>
              <p className="text-sm text-textSecondary">
                Define cleaning, standardizing, and deduplication rules for moving data from Bronze to Silver.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(16)}
                className="px-4 py-2 text-sm bg-accent/20 hover:bg-accent/40 border border-accent/50 rounded-lg text-textSecondary transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to STTM
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-2 items-center">
            <button
              onClick={generateSilverYaml}
              disabled={loadingYaml}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                loadingYaml ? 'bg-primary/50 text-white/70 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {loadingYaml ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loadingYaml ? 'Generating...' : 'Auto-Generate Transformations'}
            </button>
            
            <button
              onClick={saveYamlToGcs}
              disabled={!yamlConfig || saveYamlStatus === 'saving' || saveYamlStatus === 'success'}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                saveYamlStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : !yamlConfig || saveYamlStatus === 'saving'
                  ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {saveYamlStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Saved!
                </>
              ) : saveYamlStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Save Config to GCS'
              )}
            </button>
          </div>

          {errorYaml && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error</span>
                {errorYaml}
              </div>
            </div>
          )}

          {yamlConfig && (
            <div className="relative mt-2 flex-1">
              <textarea
                value={yamlConfig}
                onChange={(e) => setYamlConfig(e.target.value)}
                className="w-full h-[400px] p-4 bg-[#1e1e1e] border border-zinc-700/50 rounded-xl overflow-auto text-zinc-300 font-mono text-sm shadow-inner leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                spellCheck="false"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* SECTION 2: SILVER ORCHESTRATOR */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-rose-500" />
                Silver Orchestrator Generator
              </h2>
              <p className="text-sm text-textSecondary">
                Dynamically generate a Python script to orchestrate the cleaning and standardizing of data from Bronze to Silver.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-2 items-center">
            <button
              onClick={generateOrchestrator}
              disabled={loadingOrchestrator || !yamlConfig}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                loadingOrchestrator || !yamlConfig ? 'bg-rose-600/50 text-white/70 cursor-not-allowed' : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              {loadingOrchestrator ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loadingOrchestrator ? 'Generating...' : 'Generate Silver Orchestrator Script'}
            </button>
            
            <button
              onClick={saveOrchestratorToGcs}
              disabled={!orchestratorCode || saveOrchestratorStatus === 'saving' || saveOrchestratorStatus === 'success'}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                saveOrchestratorStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : !orchestratorCode || saveOrchestratorStatus === 'saving'
                  ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {saveOrchestratorStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Uploaded to GCS
                </>
              ) : saveOrchestratorStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Save Script to GCS'
              )}
            </button>
          </div>

          {errorOrchestrator && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error</span>
                {errorOrchestrator}
              </div>
            </div>
          )}

          {orchestratorCode && (
            <div className="relative mt-2 flex-1">
              <pre className="w-full h-full min-h-[300px] max-h-[500px] p-4 bg-[#1e1e1e] border border-zinc-700/50 rounded-xl overflow-auto text-zinc-300 font-mono text-sm shadow-inner leading-relaxed">
                <code>{orchestratorCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
      
      {/* SECTION 3: SILVER PIPELINE RUNNER */}
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col justify-between">
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3">
            <div>
              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-yellow-500" />
                Silver Pipeline Runner Generator
              </h2>
              <p className="text-sm text-textSecondary">
                Dynamically generate a final Python script to run the Silver layer pipeline end-to-end.
              </p>
            </div>
          </div>

          <div className="flex gap-4 mb-2 items-center">
            <button
              onClick={generatePipeline}
              disabled={loadingPipeline || !yamlConfig}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                loadingPipeline || !yamlConfig ? 'bg-yellow-600/50 text-white/70 cursor-not-allowed' : 'bg-yellow-600 text-white hover:bg-yellow-500'
              }`}
            >
              {loadingPipeline ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loadingPipeline ? 'Generating...' : 'Generate Silver Pipeline Script'}
            </button>
            
            <button
              onClick={savePipelineToGcs}
              disabled={!pipelineCode || savePipelineStatus === 'saving' || savePipelineStatus === 'success'}
              className={`py-2 px-5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                savePipelineStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : !pipelineCode || savePipelineStatus === 'saving'
                  ? 'bg-emerald-600/50 text-white/70 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {savePipelineStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Uploaded to GCS
                </>
              ) : savePipelineStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading...
                </>
              ) : (
                'Save Script to GCS'
              )}
            </button>
          </div>

          {errorPipeline && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Error</span>
                {errorPipeline}
              </div>
            </div>
          )}

          {pipelineCode && (
            <div className="relative mt-2 flex-1">
              <pre className="w-full h-full min-h-[300px] max-h-[500px] p-4 bg-[#1e1e1e] border border-zinc-700/50 rounded-xl overflow-auto text-zinc-300 font-mono text-sm shadow-inner leading-relaxed">
                <code>{pipelineCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
