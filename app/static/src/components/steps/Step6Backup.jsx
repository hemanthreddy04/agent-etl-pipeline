import React, { useState, useEffect } from 'react';

export default function Step6Backup({ projectId, onNext, onPrev }) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [tablesInfo, setTablesInfo] = useState({});

  useEffect(() => {
    fetchRecords();
    fetchProjectDetails();
  }, [projectId]);

  const fetchRecords = async () => {
    try {
      const res = await fetch(`/api/backup-records?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Error fetching backup records:", err);
    }
  };

  const fetchProjectDetails = async () => {
    try {
      const res = await fetch(`/api/project/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const watermarkMap = typeof data.watermark === 'string' ? JSON.parse(data.watermark) : (data.watermark || {});
        setTablesInfo(watermarkMap);
      }
    } catch (err) {
      console.error("Error fetching project details:", err);
    }
  };

  const triggerBackup = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/run-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });
      const data = await res.json();
      if (res.ok) {
        const successCount = data.results.filter(r => r.status === 'success').length;
        const skippedCount = data.results.filter(r => r.status === 'skipped').length;
        setStatusMsg({
          type: 'success',
          text: `Run completed successfully! Logged ID: ${data.run_id}. (${successCount} tables loaded, ${skippedCount} skipped)`
        });
        fetchRecords();
      } else {
        setStatusMsg({
          type: 'error',
          text: data.detail || "Failed to trigger backup run."
        });
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: "Network or server error occurred."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Incremental Backup Manager</h2>
          <p className="text-gray-400 text-sm mt-1">
            Detect and log incremental ranges based on the designated table watermarks.
          </p>
        </div>
        <button
          onClick={triggerBackup}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg font-medium transition duration-200 flex items-center gap-2 ${
            loading
              ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
              </svg>
              <span>Run Incremental Load</span>
            </>
          )}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          statusMsg.type === 'success' ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border border-rose-800 text-rose-300'
        }`}>
          <div className="mt-0.5">
            {statusMsg.type === 'success' ? (
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="text-sm font-medium">{statusMsg.text}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Backup History Log */}
        <div className="w-full bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-xl p-5 space-y-4 flex flex-col">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Backup Execution Logs (`dq_scan_backup`)
          </h3>
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase bg-gray-950 text-gray-400 border-b border-gray-800">
                <tr>
                  <th scope="col" className="px-4 py-3">Run ID</th>
                  <th scope="col" className="px-4 py-3">Table Name</th>
                  <th scope="col" className="px-4 py-3">Start Value</th>
                  <th scope="col" className="px-4 py-3">End Value</th>
                  <th scope="col" className="px-4 py-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                      No backup runs recorded yet. Click "Run Incremental Load" to trigger the scanner.
                    </td>
                  </tr>
                ) : (
                  records.map((rec, idx) => (
                    <tr key={idx} className="border-b border-gray-800/60 hover:bg-gray-800/20">
                      <td className="px-4 py-3 font-mono text-gray-400">{rec.run_id}</td>
                      <td className="px-4 py-3 font-medium text-gray-200">{rec.table_name}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400 max-w-[120px] truncate" title={rec.start_value}>
                        {rec.start_value}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-400 max-w-[120px] truncate" title={rec.end_value}>
                        {rec.end_value}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {rec.created_at ? new Date(rec.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-800">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition duration-200"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/10 transition duration-200"
        >
          Next: Anomaly Detection
        </button>
      </div>
    </div>
  );
}
