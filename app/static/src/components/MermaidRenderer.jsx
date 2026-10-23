import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function MermaidRenderer({ chart }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [renderedChart, setRenderedChart] = useState("");

  useEffect(() => {
    // If chart is empty/undefined, nothing to render — clear loading and return
    if (!chart || typeof chart !== 'string' || !chart.trim()) {
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    setLoading(true);

    const renderChart = async () => {
      // Wait for window.mermaid to load
      for (let i = 0; i < 50; i++) {
        if (window.mermaid) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!window.mermaid) {
        setError("Mermaid library failed to load.");
        setLoading(false);
        return;
      }
      try {
        let rawChart = chart.replace(/```mermaid/g, "").replace(/```/g, "").trim();

        // Guard: don't call mermaid.run() on empty content
        if (!rawChart) {
          setLoading(false);
          return;
        }

        // Clean up nested parenthesis/brackets inside label strings (e.g. ["("B"] -> ["B"])
        rawChart = rawChart.replace(/\[\s*"\s*\(?\s*"?\s*(\w+)\s*"?\s*\)?\s*"\s*\]/g, '["$1"]')
                           .replace(/\{\s*"\s*\(?\s*"?\s*(\w+)\s*"?\s*\)?\s*"\s*\}/g, '{"$1"}');

        const isFlowchart = rawChart.startsWith("flowchart") || rawChart.startsWith("graph");

        let cleanChart = rawChart;

        if (!isFlowchart) {
          const lines = rawChart.split('\n');
          const cleanedLines = [];
          let inEntity = false;
          for (let line of lines) {
            const lineStr = line.trim();
            if (!lineStr) continue;

            if (lineStr === "erDiagram") {
              cleanedLines.push(lineStr);
              continue;
            }
            if (lineStr.startsWith("#") || lineStr.startsWith("//")) {
              continue;
            }
            if (lineStr.includes("--") || lineStr.includes("..")) {
              let s = lineStr;
              if (!s.includes(":")) {
                s = s + ' : ""';
              } else {
                const parts = s.split(":", 2);
                let label = parts[1].trim();
                if (!label.startsWith('"') || !label.endsWith('"')) {
                  label = `"${label.replace(/"/g, "")}"`;
                }
                s = `${parts[0].trim()} : ${label}`;
              }
              cleanedLines.push(s);
              continue;
            }
            if (lineStr.endsWith("{")) {
              inEntity = true;
              cleanedLines.push(line.trimEnd());
              continue;
            }
            if (lineStr === "}") {
              inEntity = false;
              cleanedLines.push(line.trimEnd());
              continue;
            }
            if (inEntity) {
              let cleanedLine = line.trimEnd();
              cleanedLine = cleanedLine.replace(/\b(PK\s*,\s*FK|FK\s*,\s*PK)\b/gi, 'PK');
              cleanedLines.push(cleanedLine);
              continue;
            }
          }
          cleanChart = cleanedLines.join('\n').trim();
        }

        // Guard: don't run mermaid on empty cleaned content
        if (!cleanChart) {
          setLoading(false);
          return;
        }

        setRenderedChart(cleanChart);
        if (containerRef.current) {
          containerRef.current.innerHTML = cleanChart;
          containerRef.current.removeAttribute('data-processed');
          try {
            await window.mermaid.run({
              nodes: [containerRef.current]
            });
            setError(null);
          } catch (runErr) {
            console.warn("Mermaid run warning:", runErr);
            if (!containerRef.current.querySelector('svg')) {
              throw runErr;
            } else {
              setError(null);
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        setError("Invalid diagram syntax or rendering error. Please refine your inputs.");
        setLoading(false);
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div className="w-full space-y-4">
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono">
          <p className="font-semibold mb-1">Diagram Visualizer Error:</p>
          <p>{error}</p>
          <pre className="mt-2 p-2 bg-black/40 rounded overflow-x-auto text-[10px] text-zinc-400">{renderedChart || chart || ''}</pre>
        </div>
      )}
      {loading && (
        <div className="flex items-center justify-center p-12 text-xs font-mono text-textSecondary">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          Rendering diagram canvas...
        </div>
      )}
      <div 
        className="p-6 bg-background rounded-xl border border-accent/20 flex items-center justify-center overflow-auto min-h-[350px] shadow-inner w-full"
      >
        <style>{`
          .mermaid svg {
            max-width: none !important;
            height: auto !important;
            min-width: 100%;
          }
        `}</style>
        <pre className="mermaid" ref={containerRef}></pre>
      </div>
    </div>
  );
}
