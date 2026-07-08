/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Classroom, Student } from '../types';
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  CornerDownRight,
  UserPlus,
  ChevronDown,
  ArrowUpDown,
  BookOpen,
  ClipboardList,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface StudentGridProps {
  classroom: Classroom;
  onCallStudent: (id: string) => void;
  onAddStudent: (name: string, notes: string, tags: string[]) => void;
  onAddStudentsBatch: (students: { name: string; notes?: string; tags?: string[] }[]) => void;
  onEditStudent: (id: string, name: string, notes: string, tags: string[]) => void;
  onDeleteStudent: (id: string) => void;
  onResetClassroomCounts: () => void;
  onClearAllStudents: () => void;
}

export default function StudentGrid({
  classroom,
  onCallStudent,
  onAddStudent,
  onAddStudentsBatch,
  onEditStudent,
  onDeleteStudent,
  onResetClassroomCounts,
  onClearAllStudents,
}: StudentGridProps) {
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'count-asc' | 'count-desc' | 'last-called'>('default');
  
  // Single Add student form state
  const [isAddingSingle, setIsAddingSingle] = useState(false);
  const [singleName, setSingleName] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleTags, setSingleTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Batch Add state
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [importMethod, setImportMethod] = useState<'excel' | 'paste'>('excel');
  const [batchText, setBatchText] = useState('');
  const [excelError, setExcelError] = useState<string | null>(null);
  const [parsedStudents, setParsedStudents] = useState<{ name: string; notes?: string; tags?: string[] }[]>([]);
  const excelFileRef = useRef<HTMLInputElement>(null);

  // Editing student state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // Filter & Search & Sort
  const filteredAndSortedStudents = useMemo(() => {
    let list = [...classroom.students];

    // Sort
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    } else if (sortBy === 'count-asc') {
      list.sort((a, b) => a.count - b.count);
    } else if (sortBy === 'count-desc') {
      list.sort((a, b) => b.count - a.count);
    } else if (sortBy === 'last-called') {
      list.sort((a, b) => {
        const timeA = a.lastCalledAt ? new Date(a.lastCalledAt).getTime() : 0;
        const timeB = b.lastCalledAt ? new Date(b.lastCalledAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return list;
  }, [classroom.students, sortBy]);

  // Form handlers
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    onAddStudent(singleName.trim(), singleNotes.trim(), singleTags);
    setSingleName('');
    setSingleNotes('');
    setSingleTags([]);
    setIsAddingSingle(false);
  };

  // Function to download the official excel template
  const handleDownloadTemplate = () => {
    const wsData = [
      ['姓名 (必填)', '备注 (选填)', '标签 (选填，逗号隔开)'],
      ['张三', '班长，数学课代表', '活跃,优秀'],
      ['李四', '坐在第三排靠窗', '腼腆,幽默'],
      ['王五', '体育委员', '活泼']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    XLSX.writeFile(wb, `${classroom.name}-学生导入模板.xlsx`);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert sheet to json array of arrays
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (rows.length === 0) {
          setExcelError('Excel 文件为空');
          return;
        }

        let headerRowIndex = -1;
        let nameCol = 0;
        let notesCol = -1;
        let tagsCol = -1;

        // Try to identify header row or columns by keyword
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const row = rows[i];
          if (Array.isArray(row)) {
            const hasName = row.some(cell => {
              const val = String(cell || '').toLowerCase();
              return val.includes('姓名') || val.includes('name') || val.includes('学生') || val.includes('student');
            });
            if (hasName) {
              headerRowIndex = i;
              row.forEach((cell, idx) => {
                const val = String(cell || '').toLowerCase();
                if (val.includes('姓名') || val.includes('name') || val.includes('学生') || val.includes('student')) {
                  nameCol = idx;
                } else if (val.includes('备注') || val.includes('说明') || val.includes('描述') || val.includes('notes') || val.includes('desc')) {
                  notesCol = idx;
                } else if (val.includes('标签') || val.includes('特征') || val.includes('tags') || val.includes('tag')) {
                  tagsCol = idx;
                }
              });
              break;
            }
          }
        }

        // Default columns if no header found
        if (headerRowIndex === -1) {
          nameCol = 0;
          notesCol = 1;
          tagsCol = 2;
        }

        const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
        const students: { name: string; notes?: string; tags?: string[] }[] = [];

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (Array.isArray(row) && row.length > 0) {
            const nameVal = String(row[nameCol] || '').trim();
            if (nameVal && nameVal !== 'undefined' && !nameVal.includes('必填')) {
              const notesVal = notesCol !== -1 && row[notesCol] !== undefined ? String(row[notesCol] || '').trim() : '';
              const tagsVal = tagsCol !== -1 && row[tagsCol] !== undefined ? String(row[tagsCol] || '').trim() : '';
              
              // Parse tags by splitting commas or spaces
              const tagsArray = tagsVal 
                ? tagsVal.split(/[,，、\s/]+/).map(t => t.trim()).filter(t => t.length > 0)
                : [];

              students.push({
                name: nameVal,
                notes: notesVal === 'undefined' ? '' : notesVal,
                tags: tagsArray
              });
            }
          }
        }

        if (students.length === 0) {
          setExcelError('未能从表格中识别到有效的学生姓名，请确认表格包含学生姓名列');
        } else {
          setParsedStudents(students);
        }
      } catch (err) {
        setExcelError('解析 Excel 失败，请检查文件格式是否正确');
        console.error(err);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemoveParsedStudent = (index: number) => {
    setParsedStudents(parsedStudents.filter((_, i) => i !== index));
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (importMethod === 'paste') {
      if (!batchText.trim()) return;
      const rawNames = batchText.split(/[\n,\s，、]+/);
      const cleanedNames = rawNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (cleanedNames.length === 0) return;

      const formattedStudents = cleanedNames.map(name => ({
        name,
        notes: '',
        tags: []
      }));

      onAddStudentsBatch(formattedStudents);
      setBatchText('');
    } else {
      if (parsedStudents.length === 0) return;
      onAddStudentsBatch(parsedStudents);
      setParsedStudents([]);
    }
    setIsAddingBatch(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editName.trim()) return;
    onEditStudent(editingStudent.id, editName.trim(), editNotes.trim(), editTags);
    setEditingStudent(null);
  };

  const handleAddTag = (isEdit: boolean) => {
    const input = isEdit ? editTagInput : tagInput;
    if (!input.trim()) return;
    if (isEdit) {
      if (!editTags.includes(input.trim())) {
        setEditTags([...editTags, input.trim()]);
      }
      setEditTagInput('');
    } else {
      if (!singleTags.includes(input.trim())) {
        setSingleTags([...singleTags, input.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string, isEdit: boolean) => {
    if (isEdit) {
      setEditTags(editTags.filter((t) => t !== tag));
    } else {
      setSingleTags(singleTags.filter((t) => t !== tag));
    }
  };

  const handleResetConfirm = () => {
    if (
      window.confirm(
        '确定要重置当前班级所有学生的名次点名次数为 0 吗？\n这将不会删除学生名单和背景信息。'
      )
    ) {
      onResetClassroomCounts();
    }
  };

  const handleClearAllStudentsConfirm = () => {
    if (
      window.confirm(
        '⚠️ 警告：确定要一键清除当前班级中的所有学生吗？\n这将彻底删除他们名下的所有信息和提问次数，且不可撤销！'
      )
    ) {
      onClearAllStudents();
    }
  };

  const handleDeleteConfirm = (studentId: string, studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要从班级中删除学生“${studentName}”吗？`)) {
      onDeleteStudent(studentId);
    }
  };

  const handleOpenEdit = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setEditName(student.name);
    setEditNotes(student.notes);
    setEditTags(student.tags || []);
  };

  // Helper to choose badge color based on count
  const getCountBadgeStyles = (count: number) => {
    if (count === 0) {
      return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
    if (count <= 2) {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    }
    if (count <= 5) {
      return 'bg-sky-50 text-sky-700 border border-sky-100';
    }
    if (count <= 9) {
      return 'bg-amber-50 text-amber-700 border border-amber-100';
    }
    return 'bg-rose-50 text-rose-700 border border-rose-100 font-bold';
  };

  // Statistics summaries
  const totalCalls = useMemo(() => {
    return classroom.students.reduce((sum, s) => sum + s.count, 0);
  }, [classroom.students]);

  const maxCalls = useMemo(() => {
    if (classroom.students.length === 0) return 0;
    return Math.max(...classroom.students.map((s) => s.count));
  }, [classroom.students]);

  const minCalls = useMemo(() => {
    if (classroom.students.length === 0) return 0;
    return Math.min(...classroom.students.map((s) => s.count));
  }, [classroom.students]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-800">学生名册</h2>
        </div>

        {/* Filters and Batch Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sorter */}
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 px-2.5 py-1.5">
            <ArrowUpDown size={14} className="text-slate-400 mr-2" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-slate-600 focus:outline-none font-medium cursor-pointer"
            >
              <option value="default">默认序号</option>
              <option value="name">姓名拼音</option>
              <option value="count-asc">点名最少 ↑</option>
              <option value="count-desc">点名最多 ↓</option>
              <option value="last-called">最近点名</option>
            </select>
          </div>

          {/* Quick-add Buttons */}
          <button
            onClick={() => {
              setIsAddingSingle(true);
              setIsAddingBatch(false);
            }}
            id="btn-add-student-single"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors py-2 px-3 rounded-xl shadow-sm"
          >
            <UserPlus size={14} />
            <span>添加学生</span>
          </button>

          <button
            onClick={() => {
              setIsAddingBatch(true);
              setIsAddingSingle(false);
            }}
            id="btn-add-students-batch"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors py-2 px-3 rounded-xl"
          >
            <ClipboardList size={14} />
            <span>批量导入</span>
          </button>

          {/* Reset Counts & Clear All Students */}
          {classroom.students.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetConfirm}
                id="btn-clear-classroom-counts"
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors py-2 px-3 rounded-xl border border-rose-100 whitespace-nowrap"
              >
                <span>清空次数</span>
              </button>
              <button
                onClick={handleClearAllStudentsConfirm}
                id="btn-clear-all-students"
                className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors py-2 px-3 rounded-xl border border-red-100 whitespace-nowrap"
              >
                <Trash2 size={13} />
                <span>清除学生</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Modals / Forms */}
      <AnimatePresence>
        {/* Single Add Form */}
        {isAddingSingle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <UserPlus size={16} className="text-blue-600" />
                添加学生至“{classroom.name}”
              </h3>
              <button onClick={() => setIsAddingSingle(false)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>
            <form onSubmit={handleAddSingle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">学生姓名 *</label>
                  <input
                    type="text"
                    placeholder="请输入姓名"
                    required
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">背景描述 / 备注</label>
                  <input
                    type="text"
                    placeholder="如：第二排靠窗 / 英语课代表 / 比较腼腆"
                    value={singleNotes}
                    onChange={(e) => setSingleNotes(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">标签特征 (回车或点击添加)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="如：活跃、优秀"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(false);
                        }
                      }}
                      className="flex-1 text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(false)}
                      className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
                    >
                      添加
                    </button>
                  </div>
                  {/* Tags Render */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {singleTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag, false)}
                          className="text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingSingle(false)}
                    className="py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-600 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    确定添加
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* Batch Add Form */}
        {isAddingBatch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <ClipboardList size={16} className="text-blue-600" />
                批量导入学生至“{classroom.name}”
              </h3>
              <button 
                onClick={() => {
                  setIsAddingBatch(false);
                  setParsedStudents([]);
                  setExcelError(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            {/* Method Select Tabs */}
            <div className="flex border-b border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImportMethod('excel')}
                className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 transition-all ${
                  importMethod === 'excel'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>Excel / CSV 导入 (推荐)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMethod('paste')}
                className={`pb-2 px-4 flex items-center gap-1.5 border-b-2 transition-all ${
                  importMethod === 'paste'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <ClipboardList size={14} />
                <span>普通文本粘贴</span>
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4">
              {importMethod === 'excel' ? (
                <div className="space-y-4">
                  {/* Excel Upload Area */}
                  <div
                    onClick={() => excelFileRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/10 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <input
                      type="file"
                      ref={excelFileRef}
                      onChange={handleExcelUpload}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs group-hover:scale-105 transition-transform text-blue-600">
                      <Upload size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700">点击或将 Excel / CSV 文件拖拽到此处</p>
                      <p className="text-[10px] text-slate-400">支持 .xlsx, .xls, .csv 格式的文件</p>
                    </div>
                  </div>

                  {/* Guide and Download template */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/40 border border-blue-100/30 rounded-xl p-3 text-xs leading-relaxed text-slate-600">
                    <div className="flex gap-2 items-start">
                      <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        表格第一列为<strong>姓名 (必填)</strong>，第二列为<strong>备注</strong>，第三列为<strong>标签</strong> (逗号隔开)。
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white border border-blue-200/60 shadow-2xs hover:shadow-xs py-1.5 px-3 rounded-lg transition-all shrink-0 self-start sm:self-center"
                    >
                      <Download size={12} />
                      <span>下载导入模板</span>
                    </button>
                  </div>

                  {/* Parse error box */}
                  {excelError && (
                    <div className="flex gap-2 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{excelError}</span>
                    </div>
                  )}

                  {/* Excel parsed results preview */}
                  {parsedStudents.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <span>待导入学生预览</span>
                          <span className="bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded text-[10px]">
                            {parsedStudents.length} 人
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setParsedStudents([])}
                          className="text-slate-400 hover:text-rose-500 text-[10px] transition-colors font-medium"
                        >
                          清空列表
                        </button>
                      </div>
                      <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto bg-slate-50/20">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold sticky top-0">
                              <th className="py-2 px-3">姓名</th>
                              <th className="py-2 px-3">备注 / 背景信息</th>
                              <th className="py-2 px-3">标签</th>
                              <th className="py-2 px-3 text-center w-12">操作</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {parsedStudents.map((stud, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-1.5 px-3 font-semibold text-slate-800">{stud.name}</td>
                                <td className="py-1.5 px-3 text-slate-500 truncate max-w-[150px]">
                                  {stud.notes || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="py-1.5 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {stud.tags && stud.tags.length > 0 ? (
                                      stud.tags.map(t => (
                                        <span key={t} className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200/50">
                                          {t}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveParsedStudent(idx)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    请直接在下方粘贴学生名单，名字之间用<strong className="text-blue-600">逗号、空格、或换行</strong>隔开，系统会自动提取并过滤。例如：
                    <br />
                    <code className="bg-slate-50 px-1 py-0.5 rounded text-[10px] text-blue-500 inline-block mt-1 font-mono">张三 李四 王五,赵六,钱七</code>
                  </p>
                  <textarea
                    placeholder="在此输入名字列表..."
                    required
                    rows={4}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBatch(false);
                    setParsedStudents([]);
                    setExcelError(null);
                  }}
                  className="py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-600 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={importMethod === 'excel' ? parsedStudents.length === 0 : !batchText.trim()}
                  className={`py-2 px-4 font-bold rounded-xl transition-colors shadow-sm ${
                    (importMethod === 'excel' ? parsedStudents.length === 0 : !batchText.trim())
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {importMethod === 'excel' ? `确认导入 (${parsedStudents.length}名学生)` : '解析并导入'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Student Edit Modal */}
        {editingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-1.5">
                  <Edit2 size={16} className="text-blue-600" />
                  修改学生资料
                </h3>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 text-xl">
                  ×
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">姓名 *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">背景备注</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">标签 (回车或点击添加)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入标签"
                      value={editTagInput}
                      onChange={(e) => setEditTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(true);
                        }
                      }}
                      className="flex-1 text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(true)}
                      className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl transition-colors"
                    >
                      添加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag, true)}
                          className="text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-slate-600 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                  >
                    保存修改
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid View */}
      {classroom.students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 flex items-center justify-center rounded-2xl mx-auto mb-4">
            <Users size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">当前班级还没有学生</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            请点击右上角的“添加学生”录入，或者选择“批量导入”一次性复制贴入学生名单。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setIsAddingSingle(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-xl shadow-sm transition-all"
            >
              <UserPlus size={14} />
              录入单个学生
            </button>
            <button
              onClick={() => setIsAddingBatch(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-4 rounded-xl transition-all"
            >
              <ClipboardList size={14} />
              批量解析导入
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Mini Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">班级总人数</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">
                {classroom.students.length} <span className="text-xs font-normal text-slate-400">人</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">累计点名数</span>
              <span className="text-2xl font-bold text-blue-600 mt-1 block">
                {totalCalls} <span className="text-xs font-normal text-slate-400">次</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">最高被点名</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                {maxCalls} <span className="text-xs font-normal text-slate-400">次</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">最低被点名</span>
              <span className="text-2xl font-bold text-amber-500 mt-1 block">
                {minCalls} <span className="text-xs font-normal text-slate-400">次</span>
              </span>
            </div>
          </div>



          {/* Grid of Student Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredAndSortedStudents.map((student) => {
                const badgeStyle = getCountBadgeStyles(student.count);
                
                return (
                  <motion.div
                    key={student.id}
                    layoutId={`student-card-${student.id}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCallStudent(student.id)}
                    className="group relative bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer select-none shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between min-h-[120px]"
                  >
                    {/* Header: Name and Counts */}
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {student.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${badgeStyle} shrink-0`}
                        title={`已被点名 ${student.count} 次`}
                      >
                        {student.count}次
                      </span>
                    </div>

                    {/* Content: Notes and Tags */}
                    <div className="mt-2 flex-1 flex flex-col justify-end">
                      {student.notes ? (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed" title={student.notes}>
                          {student.notes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-300 italic">暂无备注</p>
                      )}

                      {/* Displaying tags if any */}
                      {student.tags && student.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-h-[36px] overflow-hidden">
                          {student.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-200/40 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer: Hover Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-xs pl-1.5 py-0.5 rounded-lg">
                      <button
                        onClick={(e) => handleOpenEdit(student, e)}
                        title="编辑资料"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-all"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConfirm(student.id, student.name, e)}
                        title="删除学生"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Tiny Indicator of last called */}
                    {student.lastCalledAt && (
                      <div className="text-[8px] text-slate-400 mt-1.5 border-t border-slate-50 pt-1 flex items-center gap-0.5">
                        <CornerDownRight size={8} />
                        <span>最近: {new Date(student.lastCalledAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
        </div>
      )}
    </div>
  );
}
