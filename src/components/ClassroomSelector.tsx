/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Classroom } from '../types';
import { Plus, Folder, Trash2, Edit2, Check, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassroomSelectorProps {
  classrooms: Classroom[];
  activeClassroomId: string | null;
  onSelectClassroom: (id: string) => void;
  onCreateClassroom: (name: string, description: string) => void;
  onDeleteClassroom: (id: string) => void;
  onUpdateClassroom: (id: string, name: string, description: string) => void;
}

export default function ClassroomSelector({
  classrooms,
  activeClassroomId,
  onSelectClassroom,
  onCreateClassroom,
  onDeleteClassroom,
  onUpdateClassroom,
}: ClassroomSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onCreateClassroom(newClassName.trim(), newClassDesc.trim());
    setNewClassName('');
    setNewClassDesc('');
    setIsAdding(false);
  };

  const startEdit = (cls: Classroom, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cls.id);
    setEditName(cls.name);
    setEditDesc(cls.description);
  };

  const saveEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    onUpdateClassroom(id, editName.trim(), editDesc.trim());
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除班级“${name}”及其中所有的学生信息吗？此操作不可撤销。`)) {
      onDeleteClassroom(id);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Folder size={18} />
          </div>
          <h2 className="text-base font-semibold text-slate-800">班级列表</h2>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          id="btn-toggle-add-class"
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors py-1.5 px-3 rounded-lg"
        >
          <Plus size={14} />
          <span>新建班级</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="overflow-hidden border border-blue-100 bg-blue-50/30 rounded-xl p-3 mb-4 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">班级名称 *</label>
              <input
                type="text"
                placeholder="例如：高一(3)班"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                required
                className="w-full text-sm py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">描述 (可选)</label>
              <input
                type="text"
                placeholder="例如：周二下午英语课"
                value={newClassDesc}
                onChange={(e) => setNewClassDesc(e.target.value)}
                className="w-full text-sm py-1.5 px-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="py-1 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                创建
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {classrooms.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl">
          <p className="text-xs text-slate-400">暂无班级数据</p>
          <p className="text-[11px] text-slate-400 mt-1">请点击上方“新建班级”开始吧</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {classrooms.map((cls) => {
            const isActive = cls.id === activeClassroomId;
            const isEditing = cls.id === editingId;

            return (
              <div
                key={cls.id}
                onClick={() => !isEditing && onSelectClassroom(cls.id)}
                className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/10'
                    : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                }`}
              >
                {isEditing ? (
                  <div className="flex-1 space-y-2 pr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="班级名称"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full text-[11px] py-1 px-2 bg-white border border-slate-200 rounded text-slate-600 focus:outline-none"
                      placeholder="班级描述"
                    />
                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={(e) => saveEdit(cls.id, e)}
                        className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 bg-slate-300 hover:bg-slate-400 text-white rounded transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <span className="truncate">{cls.name}</span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-blue-50'
                            : 'bg-slate-200/60 text-slate-600'
                        }`}
                      >
                        <Users size={8} />
                        {cls.students.length}人
                      </span>
                    </div>
                    {cls.description && (
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {cls.description}
                      </p>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEdit(cls, e)}
                      title="编辑班级"
                      className={`p-1.5 rounded-md hover:scale-105 transition-transform ${
                        isActive ? 'hover:bg-white/15 text-white' : 'hover:bg-white text-slate-500 shadow-sm border border-slate-200/50'
                      }`}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(cls.id, cls.name, e)}
                      title="删除班级"
                      className={`p-1.5 rounded-md hover:scale-105 transition-transform ${
                        isActive ? 'hover:bg-white/15 text-rose-200 hover:text-white' : 'hover:bg-rose-50 text-rose-500 border border-rose-100'
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
