import { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { importAdminQuestions } from '../../services/admin';

export const ImportModal = ({ isOpen, onClose, onImportCompleted }) => {
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'paste'
  const [file, setFile] = useState(null);
  const [pastedJson, setPastedJson] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parseError, setParseError] = useState(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showInvalidDetails, setShowInvalidDetails] = useState(true);

  const fileInputRef = useRef(null);

  // Helper to extract questions array from raw parsed JSON
  const extractQuestionsArray = (parsed) => {
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.questions)) {
      return parsed.questions;
    }
    throw new Error('JSON must be an array of questions or an object with a "questions" array.');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParseError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parsed = JSON.parse(text);
        const questions = extractQuestionsArray(parsed);
        if (questions.length === 0) {
          throw new Error('The JSON file contains 0 questions.');
        }
        if (questions.length > 300) {
          throw new Error(`Batch limit exceeded: found ${questions.length} questions (maximum allowed is 300).`);
        }
        setParsedQuestions(questions);
      } catch (err) {
        setParsedQuestions([]);
        setParseError(err.message || 'Failed to parse JSON file');
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read selected file');
    };
    reader.readAsText(selected);
  };

  // Handle text paste
  const handlePasteChange = (text) => {
    setPastedJson(text);
    setParseError(null);
    setImportResult(null);

    if (!text.trim()) {
      setParsedQuestions([]);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const questions = extractQuestionsArray(parsed);
      if (questions.length === 0) {
        throw new Error('The JSON contains an empty questions array.');
      }
      if (questions.length > 300) {
        throw new Error(`Batch limit exceeded: found ${questions.length} questions (maximum allowed is 300).`);
      }
      setParsedQuestions(questions);
    } catch (err) {
      setParsedQuestions([]);
      setParseError(err.message || 'Invalid JSON syntax');
    }
  };

  // Execute import
  const handleImport = async () => {
    if (parsedQuestions.length === 0) return;

    try {
      setImporting(true);
      setParseError(null);

      const result = await importAdminQuestions(parsedQuestions);
      setImportResult(result);

      if (onImportCompleted) {
        onImportCompleted();
      }
    } catch (err) {
      console.error('Import failed:', err);
      setParseError(err.message || 'An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  // Reset modal state
  const resetState = () => {
    setFile(null);
    setPastedJson('');
    setParsedQuestions([]);
    setParseError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Questions Batch</h2>
              <p className="text-xs text-slate-400">Import up to 300 questions from JSON</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Important Notice Banner: Imports are saved as draft */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-amber-300">Draft Status Guarantee:</strong>
              <p className="text-amber-200/90 leading-relaxed">
                All newly imported questions will be automatically saved as <strong>draft</strong>,
                regardless of any status specified in the JSON. They will only become visible to
                students after you review and approve them in the admin dashboard.
              </p>
            </div>
          </div>

          {/* Result Summary Card (When import is complete) */}
          {importResult && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Import Summary</span>
                </h3>
                <span className="text-xs text-slate-400">Batch Processed</span>
              </div>

              {/* 3 Metrics: Inserted, Duplicates, Invalid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400">Inserted (Draft)</span>
                  <p className="text-2xl font-black text-emerald-300">{importResult.inserted}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400">Skipped Duplicates</span>
                  <p className="text-2xl font-black text-amber-300">{importResult.skippedDuplicates}</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-400">Invalid Items</span>
                  <p className="text-2xl font-black text-rose-300">{importResult.invalid?.length || 0}</p>
                </div>
              </div>

              {/* Invalid Items Breakdown (if any) */}
              {importResult.invalid && importResult.invalid.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInvalidDetails(!showInvalidDetails)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-rose-300 hover:text-rose-200"
                  >
                    <span>View {importResult.invalid.length} Invalid Item Reasons</span>
                    {showInvalidDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showInvalidDetails && (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {importResult.invalid.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] space-y-1"
                        >
                          <span className="font-bold text-rose-300">
                            Item #{item.index + 1} (Index {item.index}):
                          </span>
                          <ul className="list-disc list-inside text-rose-200/80 space-y-0.5">
                            {item.errors?.map((err, eIdx) => (
                              <li key={eIdx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upload Method Tabs */}
          {!importResult && (
            <div className="space-y-4">
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('file');
                    setParseError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'file'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload .json File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setParseError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'paste'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Paste Raw JSON</span>
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {activeTab === 'file' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/50 hover:bg-slate-950 text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">
                      {file ? file.name : 'Click to select a JSON file'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports questions array formatted as JSON (up to 300 questions).
                    </p>
                  </div>
                </div>
              ) : (
                /* Tab 2: Paste JSON */
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">
                    Paste JSON payload (array or {'{ "questions": [...] }'})
                  </label>
                  <textarea
                    rows={8}
                    placeholder={`[\n  {\n    "category": "OS",\n    "topic": "Processes",\n    "difficulty": "easy",\n    "type": "short",\n    "question": "What is a process control block?",\n    "answer": "A data structure storing process state and context."\n  }\n]`}
                    value={pastedJson}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              {/* Parse Error Alert */}
              {parseError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Detection Pill */}
              {parsedQuestions.length > 0 && !parseError && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Successfully detected <strong>{parsedQuestions.length}</strong> questions in payload.
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20">
                    Ready
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {importResult ? 'Close' : 'Cancel'}
          </button>

          {!importResult ? (
            <button
              type="button"
              disabled={importing || parsedQuestions.length === 0}
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>
                {importing
                  ? 'Importing...'
                  : `Import ${parsedQuestions.length > 0 ? `${parsedQuestions.length} Questions` : 'Questions'}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={resetState}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Import Another Batch</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
