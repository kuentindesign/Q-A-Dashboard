/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Classroom } from '../types';
import { Download, Upload, FileSpreadsheet, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DataManagementProps {
  classrooms: Classroom[];
  activeClassroom: Classroom | null;
  onImportFullData: (data: Classroom[]) => void;
}

export default function DataManagement({ classrooms, activeClassroom, onImportFullData }: DataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Export entire app state as JSON
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(classrooms, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `课堂点名助手_完整备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export JSON', e);
    }
  };

  // 2. Import entire app state from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const parsed = JSON.parse(jsonContent);

        // Basic verification of format
        if (Array.isArray(parsed)) {
          const isValid = parsed.every(
            (item) => 
              typeof item.id === 'string' && 
              typeof item.name === 'string' && 
              Array.isArray(item.students)
          );

          if (isValid) {
            onImportFullData(parsed);
            setImportStatus('success');
            setTimeout(() => setImportStatus('idle'), 4000);
          } else {
            throw new Error('备份文件数据结构不完整或格式有误');
          }
        } else {
          throw new Error('备份文件不是一个有效的班级数组格式');
        }
      } catch (err: any) {
        setImportStatus('error');
        setErrorMessage(err.message || '解析JSON文件时出错，请确认文件完整无损。');
        setTimeout(() => setImportStatus('idle'), 6000);
      }
    };

    reader.readAsText(file);
    // Reset file input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Export active class to Excel CSV
  const handleExportCSV = () => {
    if (!activeClassroom) return;

    try {
      // CSV headers in Chinese (with BOM for Excel to open without garbled text)
      let csvContent = '\uFEFF';
      csvContent += '学生姓名,提问备注信息,点名统计次数\n';

      activeClassroom.students.forEach((student) => {
        // Escape quotes if any
        const safeName = student.name.replace(/"/g, '""');
        const safeNotes = student.notes.replace(/"/g, '""');
        csvContent += `"${safeName}","${safeNotes}",${student.count}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `${activeClassroom.name}_点名数据报表_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', url);
      linkElement.setAttribute('download', filename);
      linkElement.click();
    } catch (e) {
      console.error('Failed to export CSV', e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">数据安全与导入导出</h2>
          <p className="text-xs text-slate-400">所有数据完全存储在本地，可随时备份，永不丢失</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {/* Export JSON */}
        <button
          onClick={handleExportJSON}
          className="flex items-center justify-center gap-2 p-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 hover:border-slate-300 rounded-xl transition-all"
        >
          <Download size={14} className="text-slate-500" />
          <span>下载完整备份 (JSON)</span>
        </button>

        {/* Import JSON */}
        <div className="relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-all"
          >
            <Upload size={14} className="text-blue-500" />
            <span>导入备份文件 (JSON)</span>
          </button>
        </div>

        {/* Export CSV (Active Class Only) */}
        <button
          onClick={handleExportCSV}
          disabled={!activeClassroom || activeClassroom.students.length === 0}
          className={`flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-xl border transition-all ${
            !activeClassroom || activeClassroom.students.length === 0
              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-200'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>导出当前班级 Excel (CSV)</span>
        </button>
      </div>

      {/* Notifications for Import */}
      {importStatus === 'success' && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
          <Check size={14} className="shrink-0" />
          <span>数据导入成功！您的班级信息和点名记录已完全恢复。</span>
        </div>
      )}

      {importStatus === 'error' && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 p-3 rounded-xl">
          <AlertTriangle size={14} className="shrink-0" />
          <span>导入失败: {errorMessage}</span>
        </div>
      )}
    </div>
  );
}
