import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Plus, Trash2, Table, Loader2 } from 'lucide-react';

export default function Step16STTM({ projectId, setStep }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch base STTM on mount
  useEffect(() => {
    if (!projectId) return;
    const fetchSTTM = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/sttm/generate?project_id=${projectId}`);
        if (!res.ok) {
          throw new Error('Failed to generate STTM');
        }
        const data = await res.json();
        setRows(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSTTM();
  }, [projectId]);

  // Handle cell text changes
  const handleCellChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  // Add new empty row
  const addRow = () => {
    const newRow = {
      source_layer: 'bronze',
      source_table: '',
      source_column: '',
      target_layer: 'silver',
      target_table: '',
      target_column: '',
      target_datatype: 'STRING',
      transformation_rule: 'Direct Mapping',
      nullable: 'TRUE',
      is_key: 'N/A',
      business_definition: '',
      SCD_type: 'Type 1',
      dq_expectation_type: 'N/A',
      dq_reason: 'N/A'
    };
    setRows([...rows, newRow]);
  };

  // Delete row at index
  const deleteRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  // Trigger Excel download from backend
  const downloadExcel = async () => {
    try {
      const res = await fetch('/api/sttm/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      if (!res.ok) {
        throw new Error('Failed to download Excel file');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sttm_bronze_to_silver.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 items-stretch animate-fadeIn pb-10">
      <div className="w-full bg-card border border-accent/30 rounded-xl p-6 flex flex-col">
        {/* Header Section */}
        <div className="flex justify-between items-start flex-wrap gap-4 border-b border-accent/30 pb-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Table className="w-5 h-5 text-indigo-500" />
              Source to Target Mapping (STTM)
            </h2>
            <p className="text-sm text-textSecondary">
              Manage and refine the Bronze to Silver schema mappings, data types, keys, and definitions.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(15)}
              className="px-4 py-2 text-sm bg-accent/20 hover:bg-accent/40 border border-accent/50 rounded-lg text-textSecondary transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={downloadExcel}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/50 rounded-lg text-white transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download STTM as Excel
            </button>
            <button
              onClick={() => setStep(17)}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 rounded-lg text-white transition-colors flex items-center gap-2"
            >
              Next Step: Silver Curation
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>

        {/* Feedback / Loading / Error states */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 text-zinc-400 flex-col gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p>Agent is fetching schema details and compiling the base mapping...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Table Spreadsheet Container with Horizontal Scroll */}
            <div className="overflow-x-auto border border-zinc-700/50 rounded-xl max-h-[600px] mb-4">
              <table className="w-full text-left border-collapse text-sm min-w-[2000px]">
                <thead>
                  <tr className="bg-[#1a1a1a] border-b border-zinc-700/50 text-xs font-mono text-zinc-400 uppercase tracking-wider sticky top-0 z-10">
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '120px' }}>Source Layer</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '220px' }}>Source Table</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '200px' }}>Source Column</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '120px' }}>Target Layer</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '220px' }}>Target Table</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '200px' }}>Target Column</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '140px' }}>Target Datatype</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '220px' }}>Transformation Rule</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '100px' }}>Nullable</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '100px' }}>Is Key</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '320px' }}>Business Definition</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '100px' }}>SCD Type</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '180px' }}>DQ Expectation Type</th>
                    <th className="p-3 border-r border-zinc-700/50" style={{ width: '220px' }}>DQ Reason</th>
                    <th className="p-3 text-center" style={{ width: '60px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e1e1e] divide-y divide-zinc-800">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/25 transition-colors">
                      {/* Source Layer */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.source_layer || 'bronze'}
                          onChange={(e) => handleCellChange(idx, 'source_layer', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Source Table */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.source_table}
                          onChange={(e) => handleCellChange(idx, 'source_table', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Source Column */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.source_column}
                          onChange={(e) => handleCellChange(idx, 'source_column', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Target Layer */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.target_layer || 'silver'}
                          onChange={(e) => handleCellChange(idx, 'target_layer', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Target Table */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.target_table}
                          onChange={(e) => handleCellChange(idx, 'target_table', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Target Column */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.target_column}
                          onChange={(e) => handleCellChange(idx, 'target_column', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Target Datatype */}
                      <td className="p-2 border-r border-zinc-800">
                        <select
                          value={row.target_datatype}
                          onChange={(e) => handleCellChange(idx, 'target_datatype', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1 py-1 rounded text-zinc-200 select-custom"
                        >
                          <option value="STRING">STRING</option>
                          <option value="INTEGER">INTEGER</option>
                          <option value="FLOAT">FLOAT</option>
                          <option value="NUMERIC">NUMERIC</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="DATE">DATE</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                        </select>
                      </td>
                      {/* Transformation Rule */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.transformation_rule || 'Direct Mapping'}
                          onChange={(e) => handleCellChange(idx, 'transformation_rule', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Nullable */}
                      <td className="p-2 border-r border-zinc-800">
                        <select
                          value={row.nullable}
                          onChange={(e) => handleCellChange(idx, 'nullable', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1 py-1 rounded text-zinc-200 select-custom"
                        >
                          <option value="TRUE">TRUE</option>
                          <option value="FALSE">FALSE</option>
                        </select>
                      </td>
                      {/* Is Key */}
                      <td className="p-2 border-r border-zinc-800">
                        <select
                          value={row.is_key}
                          onChange={(e) => handleCellChange(idx, 'is_key', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1 py-1 rounded text-zinc-200 select-custom"
                        >
                          <option value="PK">PK</option>
                          <option value="FK">FK</option>
                          <option value="N/A">N/A</option>
                        </select>
                      </td>
                      {/* Business Definition */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.business_definition}
                          onChange={(e) => handleCellChange(idx, 'business_definition', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* SCD Type */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.SCD_type || 'Type 1'}
                          onChange={(e) => handleCellChange(idx, 'SCD_type', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* DQ Expectation Type */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.dq_expectation_type || 'N/A'}
                          onChange={(e) => handleCellChange(idx, 'dq_expectation_type', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* DQ Reason */}
                      <td className="p-2 border-r border-zinc-800">
                        <input
                          type="text"
                          value={row.dq_reason || 'N/A'}
                          onChange={(e) => handleCellChange(idx, 'dq_reason', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-1 focus:ring-primary px-1.5 py-1 rounded text-zinc-200"
                        />
                      </td>
                      {/* Actions */}
                      <td className="p-2 text-center">
                        <button
                          onClick={() => deleteRow(idx)}
                          className="p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded transition-colors text-zinc-500"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Controls */}
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={addRow}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 rounded-lg text-textSecondary hover:text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Mapping Row
              </button>
              <p className="text-xs text-textSecondary">
                Total Mapping Fields: {rows.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
