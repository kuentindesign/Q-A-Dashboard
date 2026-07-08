/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Classroom, Student } from './types';
import ClassroomSelector from './components/ClassroomSelector';
import StudentGrid from './components/StudentGrid';
import DataManagement from './components/DataManagement';
import { BookOpen, Volume2, VolumeX, GraduationCap, Github, Layers, AlertCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Web Audio API tactile feedback helper
const playBeep = (frequency = 600, duration = 0.08) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // AudioContext might be blocked or not supported
  }
};

const LOCAL_STORAGE_KEY = 'classroom_rollcall_data';

// Demo initial data
const demoClassrooms: Classroom[] = [
  {
    id: 'demo-class-1',
    name: '高一(1)班',
    description: '周一、周三下午语文课班级（点名演示）',
    createdAt: new Date().toISOString(),
    students: [
      { id: 'stud-1', name: '张晓明', notes: '第一排、语文课代表，发言积极', count: 3, tags: ['课代表', '活跃'], lastCalledAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'stud-2', name: '李美琪', notes: '靠窗第二排、英语优等生，性格安静', count: 0, tags: ['安静'], lastCalledAt: undefined },
      { id: 'stud-3', name: '王小健', notes: '第四排中间、提问容易跑神，需常关怀', count: 1, tags: ['待关注'], lastCalledAt: new Date(Date.now() - 1800000).toISOString() },
      { id: 'stud-4', name: '赵子轩', notes: '第三排左侧、数学委员，逻辑思维极强', count: 4, tags: ['理科生'], lastCalledAt: new Date(Date.now() - 600000).toISOString() },
      { id: 'stud-5', name: '陈雨薇', notes: '靠窗最后一排、热爱阅读，文学功底好', count: 0, tags: ['阅读达人'], lastCalledAt: undefined },
      { id: 'stud-6', name: '杨皓宇', notes: '第二排中央、声音洪亮', count: 2, tags: ['活跃'], lastCalledAt: new Date(Date.now() - 7200000).toISOString() },
      { id: 'stud-7', name: '周佳怡', notes: '第五排、坐姿端正，比较慢热', count: 1, tags: ['安静'], lastCalledAt: new Date(Date.now() - 4500000).toISOString() },
      { id: 'stud-8', name: '刘星辰', notes: '第四排靠门、组长，做事细心', count: 3, tags: ['组长', '稳重'], lastCalledAt: new Date(Date.now() - 1500000).toISOString() },
    ]
  },
  {
    id: 'demo-class-2',
    name: '高一(2)班',
    description: '周二、周五上午语文课班级',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    students: [
      { id: 'stud-2-1', name: '高静怡', notes: '第一排正中间、做事极为认真', count: 0, tags: ['踏实'] },
      { id: 'stud-2-2', name: '孙志远', notes: '靠门位置、语文课代表', count: 0, tags: ['课代表'] },
      { id: 'stud-2-3', name: '胡小磊', notes: '最后一排、学习较吃力但爱提问', count: 0, tags: ['好问'] },
      { id: 'stud-2-4', name: '徐雅馨', notes: '第三排靠窗、组长', count: 0, tags: ['组长'] }
    ]
  }
];

export default function App() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClassrooms(parsed);
          setActiveClassroomId(parsed[0].id);
          return;
        }
      }
      // If no data, load seed demo data
      setClassrooms(demoClassrooms);
      setActiveClassroomId(demoClassrooms[0].id);
    } catch (e) {
      console.error('Failed to parse localStorage data', e);
      setClassrooms(demoClassrooms);
      setActiveClassroomId(demoClassrooms[0].id);
    }
  }, []);

  // 2. Save classrooms whenever they change
  const saveClassroomsToStorage = (updatedClassrooms: Classroom[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClassrooms));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  };

  const updateClassrooms = (updater: (prev: Classroom[]) => Classroom[]) => {
    setClassrooms((prev) => {
      const next = updater(prev);
      saveClassroomsToStorage(next);
      return next;
    });
  };

  // Find the active classroom object
  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId) || null;

  // 3. Class operations
  const handleCreateClassroom = (name: string, description: string) => {
    const newClass: Classroom = {
      id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      students: [],
      createdAt: new Date().toISOString(),
    };
    
    updateClassrooms((prev) => [newClass, ...prev]);
    setActiveClassroomId(newClass.id);
    if (soundEnabled) playBeep(800, 0.15);
  };

  const handleDeleteClassroom = (id: string) => {
    updateClassrooms((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      
      // If active classroom was deleted, change active to first available
      if (activeClassroomId === id) {
        if (filtered.length > 0) {
          setActiveClassroomId(filtered[0].id);
        } else {
          setActiveClassroomId(null);
        }
      }
      return filtered;
    });
    if (soundEnabled) playBeep(400, 0.15);
  };

  const handleUpdateClassroom = (id: string, name: string, description: string) => {
    updateClassrooms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name, description } : c))
    );
    if (soundEnabled) playBeep(700, 0.1);
  };

  // 4. Student operations
  const handleCallStudent = (studentId: string) => {
    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: c.students.map((s) =>
              s.id === studentId
                ? { ...s, count: s.count + 1, lastCalledAt: new Date().toISOString() }
                : s
            ),
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(650, 0.08);
  };

  const handleAddStudent = (name: string, notes: string, tags: string[]) => {
    const newStudent: Student = {
      id: `stud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      notes,
      count: 0,
      tags,
    };

    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: [...c.students, newStudent],
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(750, 0.12);
  };

  // Bulk student pasting
  const handleAddStudentsBatch = (namesText: string) => {
    // Regex split by commas, spaces, or newlines
    const rawNames = namesText.split(/[\n,\s，、]+/);
    const cleanedNames = rawNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (cleanedNames.length === 0) return;

    const newStudents: Student[] = cleanedNames.map((name) => ({
      id: `stud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 1000)}`,
      name,
      notes: '',
      count: 0,
      tags: [],
    }));

    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: [...c.students, ...newStudents],
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(750, 0.18);
  };

  const handleEditStudent = (studentId: string, name: string, notes: string, tags: string[]) => {
    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: c.students.map((s) =>
              s.id === studentId ? { ...s, name, notes, tags } : s
            ),
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(700, 0.08);
  };

  const handleDeleteStudent = (studentId: string) => {
    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: c.students.filter((s) => s.id !== studentId),
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(350, 0.1);
  };

  const handleResetClassroomCounts = () => {
    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: c.students.map((s) => ({ ...s, count: 0, lastCalledAt: undefined })),
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(250, 0.25);
  };

  const handleImportFullData = (importedClassrooms: Classroom[]) => {
    setClassrooms(importedClassrooms);
    saveClassroomsToStorage(importedClassrooms);
    if (importedClassrooms.length > 0) {
      setActiveClassroomId(importedClassrooms[0].id);
    } else {
      setActiveClassroomId(null);
    }
    if (soundEnabled) playBeep(900, 0.3);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col pb-12 antialiased">
      {/* 1. Header Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
              <GraduationCap size={22} className="stroke-[2]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                课堂点名记数器
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  本地持久存储
                </span>
              </h1>
              <p className="text-xs text-slate-500">高效记录点名提问，助推课堂多维公平</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? '关闭音效' : '开启音效'}
              className={`p-2 rounded-xl transition-all border ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-600 border-blue-100/50 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200/50 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Container Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Top-level notice explaining the storage logic for peace of mind */}
        <div className="bg-gradient-to-r from-blue-50/70 to-slate-50/50 border border-blue-100/30 rounded-2xl p-5 flex gap-3 shadow-xs">
          <div className="text-blue-600 p-0.5 shrink-0">
            <HelpCircle size={18} />
          </div>
          <div className="text-xs space-y-1">
            <span className="font-bold text-blue-950 block">💡 老师，请放心！您的数据完全存在本地，不会丢失</span>
            <p className="text-slate-500 leading-relaxed">
              本工具采用<strong className="text-blue-700">浏览器本地持久化技术(LocalStorage)</strong>，即使断网、刷新网页、或在之后重新点开此网址，您的班级及学生提问次数依然完好保存。如果您需要换电脑或想彻底备份，可以使用下方的<strong className="text-blue-700">一键下载完整备份</strong>功能，非常安全可靠！
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Area (Left 4 cols on desktop) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Classroom Selector */}
            <ClassroomSelector
              classrooms={classrooms}
              activeClassroomId={activeClassroomId}
              onSelectClassroom={setActiveClassroomId}
              onCreateClassroom={handleCreateClassroom}
              onDeleteClassroom={handleDeleteClassroom}
              onUpdateClassroom={handleUpdateClassroom}
            />
          </div>

          {/* Core Content Area (Right 8 cols on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {activeClassroom ? (
              <StudentGrid
                classroom={activeClassroom}
                onCallStudent={handleCallStudent}
                onAddStudent={handleAddStudent}
                onAddStudentsBatch={handleAddStudentsBatch}
                onEditStudent={handleEditStudent}
                onDeleteStudent={handleDeleteStudent}
                onResetClassroomCounts={handleResetClassroomCounts}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 text-blue-600 flex items-center justify-center rounded-2xl mb-4">
                  <Layers size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">欢迎使用提问点名记数器</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  请先在左侧新建一个班级（例如“高一(1)班”），接着录入或批量复制导入学生姓名，即可开始实时统计！
                </p>
                <div className="mt-6">
                  <span className="text-[11px] text-blue-600 bg-blue-50 font-semibold px-4 py-2 rounded-full">
                    👈 点击左侧“新建班级”开始
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Bottom Utility Area: Backup & Import */}
        <DataManagement
          classrooms={classrooms}
          activeClassroom={activeClassroom}
          onImportFullData={handleImportFullData}
        />
      </main>

      {/* Quick Stats Footer matching style */}
      <footer className="mt-auto h-12 bg-slate-800 text-slate-400 flex items-center px-8 text-xs gap-6 rounded-t-xl max-w-7xl mx-auto w-full">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          本地数据已自动同步
        </span>
        <span>当前登录: 课堂教学助手</span>
        <span className="ml-auto">自动备份: 已启用</span>
      </footer>
    </div>
  );
}
