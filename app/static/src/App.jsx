import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import MermaidRenderer from './components/MermaidRenderer';
import Header from './components/Header';
import Step1Source from './components/steps/Step1Source';
import Step2Preview from './components/steps/Step2Preview';
import Step3Context from './components/steps/Step3Context';
import Step4Build from './components/steps/Step4Build';
import Step5EDA from './components/steps/Step5EDA';
import Step6Mappings from './components/steps/Step6Mappings';
import Step7ERD from './components/steps/Step7ERD';
import Step8Tools from './components/steps/Step8Tools';
import Step11RepoInit from './components/steps/Step11RepoInit';
import Step15Bronze from './components/steps/Step15Bronze';
import Step16Silver from './components/steps/Step16Silver';
import Step16STTM from './components/steps/Step16STTM';
import Step5DQ from './components/steps/Step5DQ';
import Step6Backup from './components/steps/Step6Backup';
import Step7Anomalies from './components/steps/Step7Anomalies';
import SidebarStepper from './components/SidebarStepper';
import PipelineSelector from './components/PipelineSelector';

function App() {
  const [projectId, setProjectId] = useState(null);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [activePhase, setActivePhase] = useState('phase1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  // Track furthest step reached
  useEffect(() => {
    if (step > maxStep) {
      setMaxStep(step);
    }
    if (step >= 1 && step <= 10) {
      setActivePhase('phase1');
    } else if (step >= 11 && step <= 13) {
      setActivePhase('phase2');
    } else if (step >= 14 && step <= 18) {
      setActivePhase('phase3');
    }
  }, [step, maxStep]);

  const handleCreateNew = () => {
    const newId = "project_" + Math.random().toString(36).substr(2, 9);
    setProjectId(newId);
    setStep(1);
    setSourceType(['BigQuery']);
    setSelectedPath({ BigQuery: '', GCS: '' });
    setSelectedItems({ BigQuery: [], GCS: [] });
    setPreviewData({});
    setBusinessContext('');
    setColumnContext({});
    setFinalGoal('');
    setAiOutput('');
    setStatus('draft');
    setFeedbackHistory([]);
    setEdaOutput('');
    setRelationships([]);
    setErdMermaid('');
    setGcpArchitectureDoc('');
  };

  const loadExistingProject = async (projId) => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/project/${projId}`);
      const data = await res.json();
      setProjectId(data.pipeline_id);

      // Parse and normalize sourceType (ensure it is always an array of active types, e.g. ['BigQuery', 'GCS'])
      let parsedSrcType = data.source_type;
      if (typeof parsedSrcType === 'string') {
        if (parsedSrcType.startsWith('[') || parsedSrcType.startsWith('{')) {
          try { parsedSrcType = JSON.parse(parsedSrcType); } catch(_) {}
        } else {
          const list = [];
          if (/bigquery/i.test(parsedSrcType)) list.push('BigQuery');
          if (/gcs|storage/i.test(parsedSrcType)) list.push('GCS');
          parsedSrcType = list;
        }
      }
      const finalSrcType = parsedSrcType || ['BigQuery'];
      setSourceType(finalSrcType);

      // Parse and normalize selectedPath (ensure it is a dictionary)
      let parsedSrcPath = data.source_path;
      if (typeof parsedSrcPath === 'string' && (parsedSrcPath.startsWith('{') || parsedSrcPath.startsWith('['))) {
        try { parsedSrcPath = JSON.parse(parsedSrcPath); } catch(_) {}
      }
      if (typeof parsedSrcPath === 'string') {
        parsedSrcPath = { BigQuery: parsedSrcPath, GCS: parsedSrcPath };
      }
      setSelectedPath(parsedSrcPath || { BigQuery: '', GCS: '' });

      // Parse and normalize selectedItems (ensure it is a dictionary)
      let parsedItems = data.selected_tables || [];
      if (typeof parsedItems === 'string') {
        try { parsedItems = JSON.parse(parsedItems); } catch(_) {}
      }
      if (Array.isArray(parsedItems)) {
        const primarySrc = finalSrcType[0] || 'BigQuery';
        parsedItems = { [primarySrc]: parsedItems };
      }
      setSelectedItems(parsedItems || { BigQuery: [], GCS: [] });

      setBusinessContext(data.business_context || '');
      setColumnContext(data.column_context || {});
      setFinalGoal(data.final_goal || '');
      setAiOutput(data.generated_doc || '');
      setStatus(data.status || 'draft');
      setFeedbackHistory(data.feedback_history || []);
      setEdaOutput(data.generated_eda || '');
      setRelationships(data.relationships || []);
      setErdMermaid(data.erd_mermaid || '');
      setGcpArchitectureDoc(data.suggested_tools || '');
      setGcpArchitectureStatus(data.status || 'draft');

      const parsedDq = typeof data.dq_rules === 'string' ? JSON.parse(data.dq_rules) : (data.dq_rules || {});
      setDqRules(parsedDq);
      setSelectedDqRules(parsedDq);

      const parsedAnoms = data.anomalies || {};
      setAnomalyRules(parsedAnoms);
      setSelectedAnomalyRules(parsedAnoms);

      // Determine the furthest completed step
      if (data.anomalies && Object.keys(data.anomalies).length > 0) {
        setActivePhase('phase3');
        setStep(14);
        setMaxStep(14);
      } else if (data.dq_rules && Object.keys(data.dq_rules).length > 0) {
        setActivePhase('phase2');
        setStep(12);
        setMaxStep(12);
      } else if (data.suggested_tools) {
        setActivePhase('phase1');
        setStep(8);
        setMaxStep(8);
      } else if (data.erd_mermaid) {
        setActivePhase('phase1');
        setStep(8);
        setMaxStep(8);
      } else if (data.relationships && data.relationships.length > 0) {
        setActivePhase('phase1');
        setStep(7);
        setMaxStep(7);
      } else if (data.generated_eda) {
        setActivePhase('phase1');
        setStep(6);
        setMaxStep(6);
      } else if (data.generated_doc) {
        setActivePhase('phase1');
        setStep(5);
        setMaxStep(5);
      } else {
        setActivePhase('phase1');
        setStep(1);
        setMaxStep(1);
      }
    } catch (err) {
      alert(`Failed to load project: ${err.message}`);
    }
  };

  const handleExit = () => {
    setProjectId(null);
  };

  // Load Mermaid CDN Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          themeVariables: {
            background: '#18181b',
            primaryColor: '#8b5cf6',
            primaryTextColor: '#f4f4f5',
            lineColor: '#a78bfa'
          }
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [sourceType, setSourceType] = useState(['BigQuery']); // array of active sources: ['BigQuery'] and/or ['GCS']
  const [availablePaths, setAvailablePaths] = useState({ BigQuery: [], GCS: [] });
  const [selectedPath, setSelectedPath] = useState({ BigQuery: '', GCS: '' });
  const [availableItems, setAvailableItems] = useState({ BigQuery: [], GCS: [] });
  const [selectedItems, setSelectedItems] = useState({ BigQuery: [], GCS: [] });
  const [previewData, setPreviewData] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Context & Goal Ingestion State
  const [businessContext, setBusinessContext] = useState('');
  const [columnContext, setColumnContext] = useState({});
  const [finalGoal, setFinalGoal] = useState('');
  const [activeTableForColCtx, setActiveTableForColCtx] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // AI Output & Approval State
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [status, setStatus] = useState('draft');

  // Phase 2 State
  const [relationships, setRelationships] = useState([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [relationshipFeedback, setRelationshipFeedback] = useState('');
  const [erdMermaid, setErdMermaid] = useState('');
  const [erdLoading, setErdLoading] = useState(false);
  const [erdFeedback, setErdFeedback] = useState('');
  const [expandedTables, setExpandedTables] = useState({});

  // EDA State
  const [edaOutput, setEdaOutput] = useState('');
  const [edaLoading, setEdaLoading] = useState(false);
  const [edaFeedback, setEdaFeedback] = useState('');

  // Data Validation States (Phase 2)
  const [dqRules, setDqRules] = useState({});
  const [selectedDqRules, setSelectedDqRules] = useState({});
  const [dqLoading, setDqLoading] = useState(false);

  // Anomaly States (Phase 2)
  const [anomalyRules, setAnomalyRules] = useState({});
  const [selectedAnomalyRules, setSelectedAnomalyRules] = useState({});
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  // Phase 3 GCP Tools Selection State
  const [gcpArchitectureDoc, setGcpArchitectureDoc] = useState('');
  const [gcpArchitectureStatus, setGcpArchitectureStatus] = useState('draft');
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsFeedback, setToolsFeedback] = useState('');

  // DFD State removed

  // Fetch available paths for active source types
  useEffect(() => {
    ['BigQuery', 'GCS'].forEach(src => {
      if (sourceType.includes(src)) {
        fetch(`/api/sources?source_type=${src}`)
          .then(res => res.json())
          .then(data => {
            const paths = data.datasets || data.buckets || [];
            setAvailablePaths(prev => ({ ...prev, [src]: paths }));
            if (!isRestoring && !selectedPath[src]) {
              setSelectedPath(prev => ({ ...prev, [src]: paths[0] || '' }));
            }
          });
      } else {
        // Clear if not active
        setAvailablePaths(prev => ({ ...prev, [src]: [] }));
        setSelectedPath(prev => ({ ...prev, [src]: '' }));
        setAvailableItems(prev => ({ ...prev, [src]: [] }));
        setSelectedItems(prev => ({ ...prev, [src]: [] }));
      }
    });
  }, [sourceType]);

  // Fetch details (tables/files) when paths change
  useEffect(() => {
    ['BigQuery', 'GCS'].forEach(src => {
      const pathVal = selectedPath[src];
      if (sourceType.includes(src) && pathVal) {
        fetch(`/api/sources/details?source_type=${src}&path=${pathVal}`)
          .then(res => res.json())
          .then(data => {
            setAvailableItems(prev => ({ ...prev, [src]: data.tables || data.files_by_folder || [] }));
            if (isRestoring) {
              setIsRestoring(false);
            }
          });
      } else {
        setAvailableItems(prev => ({ ...prev, [src]: [] }));
      }
    });
  }, [selectedPath, sourceType]);

  // Fetch preview & schema when Step 2 loads or selections change
  const fetchPreview = (customContext = '') => {
    const totalSelectedCount = Object.values(selectedItems).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    if (totalSelectedCount === 0) return;
    setPreviewLoading(true);
    fetch(`/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: sourceType,
        path: selectedPath,
        items: selectedItems,
        business_context: customContext || businessContext || ""
      })
    })
      .then(res => res.json())
      .then(data => {
        setPreviewData(data);
        setPreviewLoading(false);
        
        // Auto-suggest column definitions in state
        const initialColCtx = { ...columnContext };
        Object.keys(data).forEach(tableName => {
          if (!initialColCtx[tableName]) {
            initialColCtx[tableName] = {};
          }
          data[tableName].schema.forEach(col => {
            // Overwrite if it was blank or we explicitly request new contextual suggestions
            if (customContext || !initialColCtx[tableName][col.name]) {
              initialColCtx[tableName][col.name] = col.description || "";
            }
          });
        });
        setColumnContext(initialColCtx);

        const allSelectedTables = Object.values(selectedItems).flat();
        if (allSelectedTables.length > 0) {
          setActiveTableForColCtx(allSelectedTables[0]);
        }
      })
      .catch(() => setPreviewLoading(false));
  };

  // Trigger preview fetch when switching to step 2
  const handleNextToStep2 = () => {
    setStep(2);
    fetchPreview();
  };

  const handleTableSelect = (item, source) => {
    const currentList = selectedItems[source] || [];
    if (currentList.includes(item)) {
      setSelectedItems({
        ...selectedItems,
        [source]: currentList.filter(i => i !== item)
      });
    } else {
      setSelectedItems({
        ...selectedItems,
        [source]: [...currentList, item]
      });
    }
  };

  const handleColumnContextChange = (tableName, columnName, value) => {
    setColumnContext({
      ...columnContext,
      [tableName]: {
        ...(columnContext[tableName] || {}),
        [columnName]: value
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadedFiles([...uploadedFiles, { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' }]);
      setBusinessContext(prev => prev + '\n\n' + data.text);
    } catch (err) {
      alert("Failed to parse file");
    } finally {
      setUploading(false);
    }
  };

  const generateAIBluePrint = async () => {
    setAiLoading(true);
    setStep(4);
    
    // Extract schema and file formats information for each table from previewData
    const schemasPayload = {};
    const fileFormatsPayload = {};
    Object.keys(previewData).forEach(table => {
      if (previewData[table]?.schema) {
        schemasPayload[table] = previewData[table].schema;
      }
      if (previewData[table]?.file_format) {
        fileFormatsPayload[table] = previewData[table].file_format;
      }
    });

    try {
      const res = await fetch('/api/generate-understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projectId,
          source_type: sourceType,
          source_path: selectedPath,
          selected_tables: selectedItems,
          business_context: businessContext,
          column_context: columnContext,
          final_goal: finalGoal,
          schemas: schemasPayload,
          feedback_history: feedbackHistory,
          file_formats: fileFormatsPayload
        })
      });
      const data = await res.json();
      setAiOutput(data.generated_doc);
      setStatus(data.status);
    } catch (err) {
      alert("AI Blueprint generation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/refine-understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: feedback
        })
      });
      const data = await res.json();
      setAiOutput(data.generated_doc);
      setFeedbackHistory([...feedbackHistory, feedback]);
      setFeedback('');
    } catch (err) {
      alert("Feedback submission failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const approveBlueprint = async () => {
    try {
      const res = await fetch(`/api/approve-understanding?project_id=${projectId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setStatus(data.status);
      setStep(5);
      setMaxStep(prev => Math.max(prev, 5));
      generateEDA();
    } catch (err) {
      alert("Approval failed.");
    }
  };

  const generateDqRules = () => {
    if (!projectId) return;
    setDqLoading(true);
    fetch(`/api/generate-dq-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    })
      .then(res => res.json())
      .then(data => {
        setDqRules(prev => {
          const merged = { ...prev };
          Object.keys(data).forEach(table => {
            const existingTableRules = merged[table] || [];
            const newTableRules = data[table] || [];
            const rulesMap = new Map();
            existingTableRules.forEach(r => {
              if (r.rule_name) rulesMap.set(r.rule_name, r);
            });
            newTableRules.forEach(r => {
              if (r.rule_name) rulesMap.set(r.rule_name, r);
            });
            merged[table] = Array.from(rulesMap.values());
          });
          return merged;
        });

        setSelectedDqRules(prev => {
          const mergedSelected = { ...prev };
          Object.keys(data).forEach(table => {
            const existingSelected = mergedSelected[table] || [];
            const newTableRules = data[table] || [];
            const rulesMap = new Map();
            existingSelected.forEach(r => {
              if (r.rule_name) rulesMap.set(r.rule_name, r);
            });
            newTableRules.forEach(r => {
              if (r.rule_name) rulesMap.set(r.rule_name, r);
            });
            mergedSelected[table] = Array.from(rulesMap.values());
          });
          return mergedSelected;
        });
        setDqLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDqLoading(false);
      });
  };

  const saveDqRules = async (rules) => {
    if (!projectId) return;
    const res = await fetch(`/api/save-dq-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        dq_rules: rules
      })
    });
    if (!res.ok) {
      throw new Error("Failed to save DQ rules");
    }
  };

  const generateAnomalyRules = () => {
    if (!projectId) return;
    setAnomalyLoading(true);
    fetch(`/api/generate-anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    })
      .then(res => res.json())
      .then(data => {
        setAnomalyRules(data);
        setSelectedAnomalyRules(data);
        setAnomalyLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAnomalyLoading(false);
      });
  };

  const saveAnomalyRules = async (rules) => {
    if (!projectId) return;
    const res = await fetch(`/api/save-anomalies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        anomalies: rules
      })
    });
    if (!res.ok) {
      throw new Error("Failed to save anomaly rules");
    }
  };



  const generateEDA = async (customFeedback = "") => {
    setEdaLoading(true);
    try {
      const res = await fetch('/api/generate-eda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: customFeedback || edaFeedback || "",
          existing_eda: (customFeedback || edaFeedback) ? (edaOutput || "") : ""
        })
      });
      if (!res.ok) throw new Error("EDA generation failed");
      const data = await res.json();
      setEdaOutput(data.generated_eda);
      setMaxStep(prev => Math.max(prev, 5));
      if (customFeedback) {
        setEdaFeedback('');
      }
    } catch (err) {
      alert("EDA generation failed.");
    } finally {
      setEdaLoading(false);
    }
  };

  useEffect(() => {
    if (step === 5 && !edaOutput && !edaLoading && projectId) {
      generateEDA();
    }
  }, [step, edaOutput, edaLoading, projectId]);

  const deriveRelationships = async (customFeedback = "") => {
    setRelationshipsLoading(true);
    try {
      const res = await fetch('/api/derive-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: customFeedback || relationshipFeedback || "",
          existing_relationships: (customFeedback || relationshipFeedback) ? JSON.stringify(relationships || []) : ""
        })
      });
      if (!res.ok) throw new Error("Failed to derive relationships");
      const data = await res.json();
      setRelationships(data);
      if (customFeedback) {
        setRelationshipFeedback('');
      }
    } catch (err) {
      alert("Failed to derive relationships.");
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const generateERD = async (customFeedback = "") => {
    setErdLoading(true);
    setStep(7);
    
    // Extract schema information for each table from previewData
    const schemasPayload = {};
    Object.keys(previewData).forEach(table => {
      if (previewData[table]?.schema) {
        schemasPayload[table] = previewData[table].schema;
      }
    });

    try {
      const res = await fetch('/api/generate-erd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          relationships: Array.isArray(relationships) ? relationships : [],
          feedback: customFeedback || erdFeedback || "",
          schemas: schemasPayload,
          eda_context: edaOutput || "",
          existing_mermaid: (customFeedback || erdFeedback) ? (erdMermaid || "") : ""
        })
      });
      if (!res.ok) throw new Error("Failed to generate ERD");
      const data = await res.json();
      setErdMermaid(data.erd_mermaid);
      if (customFeedback) {
        setErdFeedback('');
      }
    } catch (err) {
      alert("Failed to generate ERD.");
    } finally {
      setErdLoading(false);
    }
  };

  const fetchToolSuggestions = async (toolDescriptionOrFeedback = "") => {
    setToolsLoading(true);
    try {
      const res = await fetch('/api/suggest-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: toolDescriptionOrFeedback || toolsFeedback || ""
        })
      });
      const data = await res.json();
      if (data.detail) throw new Error(data.detail);
      setGcpArchitectureDoc(data.suggested_tools);
      setGcpArchitectureStatus(data.gcp_architecture_status || 'draft');
      setStatus(data.gcp_architecture_status || 'draft');
      setToolsFeedback('');
    } catch (err) {
      alert(`Failed to generate GCP architecture: ${err.message}`);
    } finally {
      setToolsLoading(false);
    }
  };

  const approveGcpArchitecture = async () => {
    try {
      const res = await fetch(`/api/approve-tools?project_id=${projectId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setGcpArchitectureStatus(data.status);
      setStatus(data.status);
    } catch (err) {
      alert("Failed to approve architecture specification.");
    }
  };

  // DFD methods removed



  // Renders markdown using marked library and Tailwind typography
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Sanitize abnormally long hyphen strings (e.g. generated by AI in table dividers)
    const sanitizedText = text.replace(/-{4,}/g, '---');

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    const htmlContent = marked.parse(sanitizedText);
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  if (!projectId) {
    return <PipelineSelector onCreateNew={handleCreateNew} onSelectProject={loadExistingProject} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-textPrimary">
      <Header
        step={step}
        status={status}
        onExit={handleExit}
        pipelineId={projectId}
        sourceType={sourceType}
      />

      <div className="flex-1 flex overflow-hidden">
        <SidebarStepper
          step={step}
          maxStep={maxStep}
          status={status}
          selectedItems={Object.values(selectedItems).flat()}
          finalGoal={finalGoal}
          edaOutput={edaOutput}
          relationships={relationships}
          fetchPreview={fetchPreview}
          generateEDA={generateEDA}
          deriveRelationships={deriveRelationships}
          generateERD={generateERD}
          setStep={setStep}
          gcpArchitectureDoc={gcpArchitectureDoc}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          previewData={previewData}
          erdMermaid={erdMermaid}
          activePhase={activePhase}
          setActivePhase={setActivePhase}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full flex flex-col">
          {step === 1 && (
            <Step1Source
              sourceType={sourceType}
              setSourceType={setSourceType}
              selectedPath={selectedPath}
              setSelectedPath={setSelectedPath}
              availablePaths={availablePaths}
              availableItems={availableItems}
              selectedItems={selectedItems}
              handleTableSelect={handleTableSelect}
              handleNextToStep2={handleNextToStep2}
            />
          )}

          {step === 2 && (
            <Step2Preview
              selectedItems={Object.values(selectedItems).flat()}
              activeTableForColCtx={activeTableForColCtx}
              setActiveTableForColCtx={setActiveTableForColCtx}
              previewLoading={previewLoading}
              previewData={previewData}
              fetchPreview={fetchPreview}
              setStep={setStep}
            />
          )}

          {step === 3 && (
            <Step3Context
              finalGoal={finalGoal}
              setFinalGoal={setFinalGoal}
              businessContext={businessContext}
              setBusinessContext={setBusinessContext}
              uploadedFiles={uploadedFiles}
              uploading={uploading}
              handleFileUpload={handleFileUpload}
              activeTableForColCtx={activeTableForColCtx}
              setActiveTableForColCtx={setActiveTableForColCtx}
              selectedItems={Object.values(selectedItems).flat()}
              previewData={previewData}
              previewLoading={previewLoading}
              columnContext={columnContext}
              handleColumnContextChange={handleColumnContextChange}
              fetchPreview={fetchPreview}
              generateAIBluePrint={generateAIBluePrint}
              setStep={setStep}
            />
          )}

          {step === 4 && (
            <Step4Build
              aiLoading={aiLoading}
              aiOutput={aiOutput}
              feedbackHistory={feedbackHistory}
              feedback={feedback}
              setFeedback={setFeedback}
              submitFeedback={submitFeedback}
              status={status}
              approveBlueprint={approveBlueprint}
              setStep={setStep}
              generateAIBluePrint={generateAIBluePrint}
              renderMarkdown={renderMarkdown}
            />
          )}

          {step === 5 && (
            <Step5EDA
              edaLoading={edaLoading}
              edaOutput={edaOutput}
              edaFeedback={edaFeedback}
              setEdaFeedback={setEdaFeedback}
              generateEDA={generateEDA}
              deriveRelationships={deriveRelationships}
              setStep={setStep}
              renderMarkdown={renderMarkdown}
            />
          )}

          {step === 6 && (
            <Step6Mappings
              selectedItems={Object.values(selectedItems).flat()}
              expandedTables={expandedTables}
              setExpandedTables={setExpandedTables}
              previewData={previewData}
              relationshipsLoading={relationshipsLoading}
              relationships={relationships}
              setRelationships={setRelationships}
              relationshipFeedback={relationshipFeedback}
              setRelationshipFeedback={setRelationshipFeedback}
              deriveRelationships={deriveRelationships}
              generateERD={generateERD}
              setStep={setStep}
            />
          )}

          {step === 7 && (
            <Step7ERD
              erdMermaid={erdMermaid}
              erdLoading={erdLoading}
              erdFeedback={erdFeedback}
              setErdFeedback={setErdFeedback}
              generateERD={generateERD}
              setStep={setStep}
              setGcpArchitectureDoc={setGcpArchitectureDoc}
            />
          )}

          {step === 8 && (
            <Step8Tools
              gcpArchitectureDoc={gcpArchitectureDoc}
              gcpArchitectureStatus={gcpArchitectureStatus}
              toolsLoading={toolsLoading}
              toolsFeedback={toolsFeedback}
              setToolsFeedback={setToolsFeedback}
              fetchToolSuggestions={fetchToolSuggestions}
              approveGcpArchitecture={approveGcpArchitecture}
              setStep={setStep}
              renderMarkdown={renderMarkdown}
              setGcpArchitectureDoc={setGcpArchitectureDoc}
            />
          )}

          {step === 11 && (
            <Step5DQ
              projectId={projectId}
              dqLoading={dqLoading}
              dqRules={dqRules}
              generateDqRules={generateDqRules}
              saveDqRules={saveDqRules}
              selectedDqRules={selectedDqRules}
              setSelectedDqRules={setSelectedDqRules}
              setStep={setStep}
              tables={Object.values(selectedItems).flat()}
            />
          )}

          {step === 12 && (
            <Step6Backup
              projectId={projectId}
              onNext={() => setStep(13)}
              onPrev={() => setStep(11)}
            />
          )}

          {step === 13 && (
            <Step7Anomalies
              projectId={projectId}
              anomalyLoading={anomalyLoading}
              anomalyRules={anomalyRules}
              generateAnomalyRules={generateAnomalyRules}
              saveAnomalyRules={saveAnomalyRules}
              selectedAnomalyRules={selectedAnomalyRules}
              setSelectedAnomalyRules={setSelectedAnomalyRules}
              onNext={() => setStep(14)}
              onPrev={() => setStep(12)}
              tables={Object.values(selectedItems).flat()}
            />
          )}

          {step === 14 && (
            <Step11RepoInit
              projectId={projectId}
              setStep={setStep}
            />
          )}

          {step === 15 && (
            <Step15Bronze
              projectId={projectId}
              setStep={setStep}
            />
          )}

          {step === 16 && (
            <Step16STTM
              projectId={projectId}
              setStep={setStep}
            />
          )}

          {step === 17 && (
            <Step16Silver
              projectId={projectId}
              setStep={setStep}
            />
          )}


        </main>
      </div>
    </div>
  );
}

export default App;
