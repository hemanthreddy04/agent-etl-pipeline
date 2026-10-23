import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Circle, AlertCircle, Folder, FileCode, Check } from 'lucide-react';

function Step11RepoInit({ projectId, setStep }) {
  const [initLoading, setInitLoading] = useState(false);
  const [initStatus, setInitStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error' | 'already_exists'
  const [createdFiles, setCreatedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const targetGcsPath = `gs://codebase_etl_pipeline/${projectId}_pipeline`;

  const expectedTree = [
    { type: 'folder', path: 'config/', label: 'config/' },
    { type: 'file', path: 'config/config.yaml', label: 'config/config.yaml' },
    { type: 'folder', path: 'dags/', label: 'dags/' },
    { type: 'file', path: 'dags/medallion_pipeline_dag.py', label: 'dags/medallion_pipeline_dag.py' },
    { type: 'folder', path: 'pipelines/', label: 'pipelines/' },
    { type: 'file', path: 'pipelines/bronze_pipeline.py', label: 'pipelines/bronze_pipeline.py' },
    { type: 'file', path: 'pipelines/silver_pipeline.py', label: 'pipelines/silver_pipeline.py' },
    { type: 'file', path: 'pipelines/gold_pipeline.py', label: 'pipelines/gold_pipeline.py' },
    { type: 'folder', path: 'src/', label: 'src/' },
    { type: 'folder', path: 'src/readers/', label: 'src/readers/' },
    { type: 'file', path: 'src/readers/file_reader.py', label: 'src/readers/file_reader.py' },
    { type: 'folder', path: 'src/bronze/', label: 'src/bronze/' },
    { type: 'file', path: 'src/bronze/bronze_processor.py', label: 'src/bronze/bronze_processor.py' },
    { type: 'folder', path: 'src/silver/', label: 'src/silver/' },
    { type: 'file', path: 'src/silver/silver_processor.py', label: 'src/silver/silver_processor.py' },
    { type: 'folder', path: 'src/gold/', label: 'src/gold/' },
    { type: 'file', path: 'src/gold/gold_processor.py', label: 'src/gold/gold_processor.py' },
    { type: 'folder', path: 'src/dq/', label: 'src/dq/' },
    { type: 'file', path: 'src/dq/dq_executor.py', label: 'src/dq/dq_executor.py' },
    { type: 'folder', path: 'src/anomaly/', label: 'src/anomaly/' },
    { type: 'file', path: 'src/anomaly/anomaly_detector.py', label: 'src/anomaly/anomaly_detector.py' },
    { type: 'folder', path: 'src/gcp/', label: 'src/gcp/' },
    { type: 'file', path: 'src/gcp/secret_manager.py', label: 'src/gcp/secret_manager.py' },
    { type: 'folder', path: 'src/utils/', label: 'src/utils/' },
    { type: 'file', path: 'src/utils/config_loader.py', label: 'src/utils/config_loader.py' },
    { type: 'file', path: 'src/utils/logger.py', label: 'src/utils/logger.py' },
    { type: 'file', path: 'src/utils/alert.py', label: 'src/utils/alert.py' },
    { type: 'file', path: 'requirements.txt', label: 'requirements.txt' },
    { type: 'file', path: 'README.md', label: 'README.md' },
    { type: 'file', path: '.gitignore', label: '.gitignore' }
  ];

  useEffect(() => {
    const checkRepoStatus = async () => {
      try {
        const res = await fetch(`/api/check-gcs-repo?project_id=${projectId}`);
        const data = await res.json();
        if (data.exists) {
          setInitStatus('already_exists');
          // Mark all expected files as active/green
          setCreatedFiles(expectedTree.map(item => item.path));
        }
      } catch (err) {
        console.error("Failed to check GCS repo status:", err);
      }
    };
    if (projectId) {
      checkRepoStatus();
    }
  }, [projectId]);

  const handleInitialize = async () => {
    setInitLoading(true);
    setInitStatus('loading');
    setCreatedFiles([]);
    setErrorMessage('');

    try {
      const res = await fetch('/api/initialize-gcs-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to initialize GCS workspace');
      }

      // Simulate real-time folder creation mapping to wow the user
      let currentCreated = [];
      for (const file of data.created_files) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        currentCreated.push(file);
        // Add parent directory folders as created if they match
        const parts = file.split('/');
        if (parts.length > 1) {
          const folderPath = parts.slice(0, -1).join('/') + '/';
          if (!currentCreated.includes(folderPath)) {
            currentCreated.push(folderPath);
          }
        }
        setCreatedFiles([...currentCreated]);
      }

      setInitStatus('success');
    } catch (err) {
      setInitStatus('error');
      setErrorMessage(err.message);
    } finally {
      setInitLoading(false);
    }
  };

  const isCreated = (itemPath) => {
    return createdFiles.some(f => f === itemPath || f.startsWith(itemPath));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Initialize GCS Code Workspace</h2>
          <p className="text-zinc-400 mt-1">Initialize the directory layout and empty files in Google Cloud Storage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Control Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white">Target Destination</h3>

            <div className="bg-black/40 border border-zinc-800 rounded-lg p-3 space-y-1">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">GCS Location</span>
              <div className="text-violet-400 font-mono text-sm break-all">
                {targetGcsPath}
              </div>
            </div>

            <button
              onClick={handleInitialize}
              disabled={initLoading || initStatus === 'success' || initStatus === 'already_exists'}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${initStatus === 'success' || initStatus === 'already_exists'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20'
                }`}
            >
              {initLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Initializing Workspace...
                </>
              ) : (initStatus === 'success' || initStatus === 'already_exists') ? (
                <>
                  <Check className="w-5 h-5" />
                  Workspace Ready in GCS
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Initialize GCS Repository
                </>
              )}
            </button>

            {initStatus === 'success' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Success!</span>
                  All empty folder templates and placeholder files were successfully created in GCS.
                </div>
              </div>
            )}

            {initStatus === 'already_exists' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400 flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">GCS Repository already exists</span>
                  You cannot generate it again. Ready to design the ingestion pipelines.
                </div>
              </div>
            )}

            {initStatus === 'error' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Failed to Create Repository</span>
                  {errorMessage || 'Authentication error. Make sure your local GCP CLI configuration has write permissions.'}
                </div>
              </div>
            )}

            {(initStatus === 'success' || initStatus === 'already_exists') && (
              <div className="mt-6">
                <button
                  onClick={() => setStep(15)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Proceed to Bronze Ingestion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Directory Visualizer */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold text-white mb-3">Workspace Visualizer</h3>

          <div className="flex-1 overflow-y-auto bg-black/40 border border-zinc-800/80 rounded-lg p-4 font-mono text-sm space-y-1.5 scrollbar-thin">
            {expectedTree.map((item, idx) => {
              const created = isCreated(item.path);
              const isFolder = item.type === 'folder';
              // Calculate indentation
              const indentCount = item.path.split('/').length - (isFolder ? 2 : 1);

              return (
                <div
                  key={idx}
                  style={{ paddingLeft: `${indentCount * 24}px` }}
                  className={`flex items-center justify-between py-0.5 rounded px-2 transition-colors ${created ? 'bg-emerald-500/5 text-zinc-200' : 'text-zinc-500'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {isFolder ? (
                      <Folder className={`w-4 h-4 ${created ? 'text-violet-400' : 'text-zinc-600'}`} />
                    ) : (
                      <FileCode className={`w-4 h-4 ${created ? 'text-zinc-300' : 'text-zinc-700'}`} />
                    )}
                    <span className={created ? 'text-zinc-200' : 'text-zinc-600'}>
                      {item.label.split('/').pop()}
                    </span>
                  </div>

                  {created ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : initLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-800 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Step11RepoInit;
