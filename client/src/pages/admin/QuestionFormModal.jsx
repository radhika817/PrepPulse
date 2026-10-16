import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  HelpCircle,
  Link as LinkIcon,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { createAdminQuestion, updateAdminQuestion } from '../../services/admin';

const CATEGORIES = [
  'OS',
  'DSA',
  'OOP',
  'CPP',
  'DBMS',
  'SQL',
  'CN',
  'COA',
  'WEB',
  'SYSDESIGN',
  'APTITUDE',
  'HR',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)' },
  { value: 'short', label: 'Short Answer / Conceptual' },
  { value: 'coding_link', label: 'Coding Challenge Link' },
  { value: 'hr', label: 'Behavioral / HR' },
];
const SOURCE_TYPES = ['own', 'ai_draft', 'licensed'];
const REVIEW_STATUSES = ['draft', 'approved', 'rejected'];

export const QuestionFormModal = ({ isOpen, onClose, questionToEdit, onSaved }) => {
  const isEditing = Boolean(questionToEdit && questionToEdit._id);

  // Form Fields State
  const [formData, setFormData] = useState({
    category: 'OS',
    topic: '',
    difficulty: 'easy',
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    answer: '',
    explanation: '',
    followUp: '',
    link: '',
    tags: '',
    sourceType: 'own',
    sourceNote: '',
    reviewStatus: 'draft',
  });

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateError, setDuplicateError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Preview selected state (for interactive MCQ in student preview)
  const [previewSelectedOption, setPreviewSelectedOption] = useState(null);

  // Populate form on open / questionToEdit change
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && questionToEdit) {
      const opts = Array.isArray(questionToEdit.options) && questionToEdit.options.length > 0
        ? [...questionToEdit.options]
        : ['', ''];

      let matchIndex = opts.findIndex(
        (o) => o.trim().toLowerCase() === (questionToEdit.answer || '').trim().toLowerCase()
      );
      if (matchIndex === -1 && opts.length > 0 && questionToEdit.type === 'mcq') {
        matchIndex = 0;
      }

      setFormData({
        category: questionToEdit.category || 'OS',
        topic: questionToEdit.topic || '',
        difficulty: questionToEdit.difficulty || 'easy',
        type: questionToEdit.type || 'mcq',
        question: questionToEdit.question || '',
        options: opts,
        correctOptionIndex: matchIndex >= 0 ? matchIndex : 0,
        answer: questionToEdit.answer || '',
        explanation: questionToEdit.explanation || '',
        followUp: questionToEdit.followUp || '',
        link: questionToEdit.link || '',
        tags: Array.isArray(questionToEdit.tags) ? questionToEdit.tags.join(', ') : '',
        sourceType: questionToEdit.sourceType || 'own',
        sourceNote: questionToEdit.sourceNote || '',
        reviewStatus: questionToEdit.reviewStatus || 'draft',
      });
    } else {
      // Default clean create form
      setFormData({
        category: 'OS',
        topic: '',
        difficulty: 'easy',
        type: 'mcq',
        question: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        answer: '',
        explanation: '',
        followUp: '',
        link: '',
        tags: '',
        sourceType: 'own',
        sourceNote: '',
        reviewStatus: 'draft',
      });
    }

    setFieldErrors({});
    setDuplicateError(null);
    setActiveTab('edit');
    setPreviewSelectedOption(null);
  }, [isOpen, isEditing, questionToEdit]);

  if (!isOpen) return null;

  // Handle generic field change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (duplicateError && field === 'question') {
      setDuplicateError(null);
    }
  };

  // Option text change for MCQ
  const handleOptionChange = (index, value) => {
    const updated = [...formData.options];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, options: updated }));

    if (fieldErrors.options || fieldErrors.answer) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.options;
        delete next.answer;
        return next;
      });
    }
  };

  // Add an option field for MCQ
  const addOption = () => {
    if (formData.options.length >= 6) return;
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  // Remove an option field for MCQ
  const removeOption = (indexToRemove) => {
    if (formData.options.length <= 2) return;
    const updated = formData.options.filter((_, idx) => idx !== indexToRemove);
    let newCorrect = formData.correctOptionIndex;
    if (newCorrect >= updated.length) {
      newCorrect = updated.length - 1;
    }
    setFormData((prev) => ({
      ...prev,
      options: updated,
      correctOptionIndex: newCorrect,
    }));
  };

  // Validate form client-side before sending
  const validate = () => {
    const errors = {};

    if (!formData.topic.trim()) {
      errors.topic = 'Topic is required';
    }

    if (!formData.question.trim() || formData.question.trim().length < 5) {
      errors.question = 'Question must be at least 5 characters long';
    }

    if (formData.type === 'mcq') {
      const cleanOptions = formData.options.map((o) => o.trim());
      if (cleanOptions.length < 2) {
        errors.options = 'At least 2 options are required for MCQ';
      } else if (cleanOptions.some((o) => o.length === 0)) {
        errors.options = 'All option choices must have text';
      }

      const selectedOptionText = cleanOptions[formData.correctOptionIndex];
      if (!selectedOptionText) {
        errors.answer = 'Please select a correct option';
      }

      if (!formData.explanation.trim()) {
        errors.explanation = 'Explanation is required for MCQ questions';
      }
    } else if (formData.type === 'coding_link') {
      if (!formData.link.trim()) {
        errors.link = 'A valid URL link is required for coding challenges';
      } else {
        try {
          new URL(formData.link.trim());
        } catch {
          errors.link = 'Must be a valid HTTP or HTTPS URL';
        }
      }
      if (!formData.answer.trim()) {
        errors.answer = 'Model answer or approach summary is required';
      }
    } else {
      // short or hr
      if (!formData.answer.trim()) {
        errors.answer = 'Model answer is required';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setDuplicateError(null);

      // Build payload matching server Zod schema
      let finalAnswer = formData.answer.trim();
      let finalOptions = [];

      if (formData.type === 'mcq') {
        finalOptions = formData.options.map((o) => o.trim());
        finalAnswer = finalOptions[formData.correctOptionIndex];
      }

      const payload = {
        category: formData.category,
        topic: formData.topic.trim(),
        difficulty: formData.difficulty,
        type: formData.type,
        question: formData.question.trim(),
        options: formData.type === 'mcq' ? finalOptions : [],
        answer: finalAnswer,
        explanation: formData.explanation.trim() || '',
        followUp: formData.followUp.trim() || null,
        link: formData.type === 'coding_link' && formData.link.trim() ? formData.link.trim() : null,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        sourceType: formData.sourceType,
        sourceNote: formData.sourceNote.trim(),
        reviewStatus: formData.reviewStatus,
      };

      if (isEditing) {
        await updateAdminQuestion(questionToEdit._id, payload);
      } else {
        await createAdminQuestion(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      if (err.response?.status === 409 || err.code === 'DUPLICATE_QUESTION') {
        setDuplicateError(
          err.response?.data?.error?.message ||
            'A question with identical or equivalent text already exists in the question bank.'
        );
      } else {
        setDuplicateError(err.message || 'An unexpected error occurred while saving the question.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Question' : 'Create New Question'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Updating ID: ${questionToEdit._id}`
                  : 'Add a new interview problem to the database'}
              </p>
            </div>
          </div>

          {/* Edit vs Student Preview Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 rounded-lg bg-slate-800 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Edit Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Student Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Duplicate Error Banner (409) */}
        {duplicateError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-bold text-rose-200">Duplicate Question Detected:</strong>
              <p>{duplicateError}</p>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'edit' ? (
            <form id="question-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Category, Topic, Difficulty Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Virtual Memory"
                    value={formData.topic}
                    onChange={(e) => handleChange('topic', e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                      fieldErrors.topic ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {fieldErrors.topic && (
                    <span className="text-[10px] text-rose-400 mt-1 block">{fieldErrors.topic}</span>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Difficulty *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type, Source Type, Review Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Question Type */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Question Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Type */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Source Type
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => handleChange('sourceType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {SOURCE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s === 'ai_draft' ? 'AI Draft' : s === 'own' ? 'Original / Own' : 'Licensed'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Review Status */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Review Status *
                  </label>
                  <select
                    value={formData.reviewStatus}
                    onChange={(e) => handleChange('reviewStatus', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 text-white capitalize"
                  >
                    {REVIEW_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter the complete question prompt..."
                  value={formData.question}
                  onChange={(e) => handleChange('question', e.target.value)}
                  className={`w-full p-3 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    fieldErrors.question ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                {fieldErrors.question && (
                  <span className="text-[10px] text-rose-400 mt-1 block">{fieldErrors.question}</span>
                )}
              </div>

              {/* Dynamic Type Section: MCQ Options with Correct-Option Selector */}
              {formData.type === 'mcq' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">MCQ Choices & Correct Option</span>
                      <p className="text-[10px] text-slate-400">
                        Select the radio button on the left to mark that choice as the correct model answer.
                      </p>
                    </div>
                    {formData.options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>

                  {fieldErrors.options && (
                    <span className="text-[10px] text-rose-400 block">{fieldErrors.options}</span>
                  )}
                  {fieldErrors.answer && (
                    <span className="text-[10px] text-rose-400 block">{fieldErrors.answer}</span>
                  )}

                  <div className="space-y-2">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Radio for correct choice */}
                        <label
                          className="flex items-center gap-1.5 cursor-pointer"
                          title="Set as correct answer"
                        >
                          <input
                            type="radio"
                            name="correctOption"
                            checked={formData.correctOptionIndex === idx}
                            onChange={() => handleChange('correctOptionIndex', idx)}
                            className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-400 w-4 text-center">
                            {String.fromCharCode(65 + idx)}
                          </span>
                        </label>

                        {/* Option input */}
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className={`flex-1 px-3 py-1.5 bg-slate-900 border rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none ${
                            formData.correctOptionIndex === idx
                              ? 'border-emerald-500/50 bg-emerald-950/10'
                              : 'border-slate-800 focus:border-indigo-500'
                          }`}
                        />

                        {/* Delete option button */}
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Type Section: Coding Link */}
              {formData.type === 'coding_link' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">
                    Coding Challenge Link * (LeetCode, HackerRank, GitHub)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="url"
                      placeholder="https://leetcode.com/problems/..."
                      value={formData.link}
                      onChange={(e) => handleChange('link', e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                        fieldErrors.link ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.link && (
                    <span className="text-[10px] text-rose-400 mt-1 block">{fieldErrors.link}</span>
                  )}
                </div>
              )}

              {/* Model Answer (for non-MCQ) */}
              {formData.type !== 'mcq' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Model Answer *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter the canonical model answer..."
                    value={formData.answer}
                    onChange={(e) => handleChange('answer', e.target.value)}
                    className={`w-full p-3 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                      fieldErrors.answer ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {fieldErrors.answer && (
                    <span className="text-[10px] text-rose-400 mt-1 block">{fieldErrors.answer}</span>
                  )}
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Explanation {formData.type === 'mcq' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed concept breakdown, edge cases, and rationale..."
                  value={formData.explanation}
                  onChange={(e) => handleChange('explanation', e.target.value)}
                  className={`w-full p-3 bg-slate-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    fieldErrors.explanation ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                {fieldErrors.explanation && (
                  <span className="text-[10px] text-rose-400 mt-1 block">
                    {fieldErrors.explanation}
                  </span>
                )}
              </div>

              {/* Follow-up Question */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Interviewer Follow-up Question (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. How does this behavior change under high concurrency?"
                  value={formData.followUp}
                  onChange={(e) => handleChange('followUp', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tags & Source Note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="paging, memory, concurrency"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Source Reference / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Silberschatz OS Concept Ch 9"
                    value={formData.sourceNote}
                    onChange={(e) => handleChange('sourceNote', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* Student Practice Mode Preview */
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                <span>
                  <strong>Student Preview:</strong> This is exactly how the question renders in student practice mode. Answer and explanation are strictly hidden until attempted or revealed.
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/20">
                  Simulated
                </span>
              </div>

              {/* Question Card Preview */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold border border-indigo-500/30">
                      {formData.category}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{formData.topic || 'Topic'}</span>
                  </div>
                  <span
                    className={`text-xs font-bold capitalize ${
                      formData.difficulty === 'easy'
                        ? 'text-emerald-400'
                        : formData.difficulty === 'medium'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formData.difficulty}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white whitespace-pre-wrap">
                  {formData.question || 'Question prompt will appear here...'}
                </h3>

                {/* MCQ Student Option Buttons */}
                {formData.type === 'mcq' && (
                  <div className="space-y-2 pt-2">
                    {formData.options.filter(Boolean).map((opt, idx) => {
                      const isSelected = previewSelectedOption === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewSelectedOption(idx)}
                          className={`w-full p-3 rounded-xl text-xs text-left font-medium transition-all flex items-center justify-between border ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Non-MCQ Practice Preview Button */}
                {formData.type !== 'mcq' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      Show Answer & Rate Recall
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="question-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving Question...' : isEditing ? 'Update Question' : 'Save Question'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionFormModal;
