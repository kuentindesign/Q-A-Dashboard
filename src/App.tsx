/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Classroom, Student } from './types';
import ClassroomSelector from './components/ClassroomSelector';
import StudentGrid from './components/StudentGrid';
import { BookOpen, Volume2, VolumeX, GraduationCap, Github, Layers, AlertCircle, HelpCircle, Cloud, User, CloudLightning } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  getClassroomsFromCloud, 
  saveClassroomToCloud, 
  deleteClassroomFromCloud, 
  mergeLocalClassroomsToCloud,
  OperationType,
  handleFirestoreError 
} from './lib/db';
import AuthModal from './components/AuthModal';

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

  // Firebase states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasLocalData, setHasLocalData] = useState(false);

  const prevClassroomsRef = useRef<Classroom[]>([]);

  // 1. Initial Load and Auth State Listener
  useEffect(() => {
    // Check if we have some local classrooms in localStorage
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasLocalData(true);
        }
      }
    } catch (e) {
      console.error(e);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Logged in: Load classrooms from Cloud
        setSyncing(true);
        try {
          const cloudClassrooms = await getClassroomsFromCloud(currentUser.uid);
          setClassrooms(cloudClassrooms);
          prevClassroomsRef.current = cloudClassrooms;
          if (cloudClassrooms.length > 0) {
            setActiveClassroomId(cloudClassrooms[0].id);
          } else {
            setActiveClassroomId(null);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSyncing(false);
        }
      } else {
        // Not logged in: Load classrooms from LocalStorage
        try {
          const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setClassrooms(parsed);
              prevClassroomsRef.current = parsed;
              setActiveClassroomId(parsed[0].id);
              return;
            }
          }
          // Default seed data
          setClassrooms(demoClassrooms);
          prevClassroomsRef.current = demoClassrooms;
          setActiveClassroomId(demoClassrooms[0].id);
        } catch (e) {
          setClassrooms(demoClassrooms);
          prevClassroomsRef.current = demoClassrooms;
          setActiveClassroomId(demoClassrooms[0].id);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Save classrooms to LocalStorage (as a local backup)
  const saveClassroomsToStorage = (updatedClassrooms: Classroom[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedClassrooms));
      if (updatedClassrooms.length > 0) {
        setHasLocalData(true);
      } else {
        setHasLocalData(false);
      }
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  };

  // 3. Side-effect to automatically sync state changes with Cloud
  useEffect(() => {
    if (!user || authLoading) return;

    const syncWithCloud = async () => {
      const prev = prevClassroomsRef.current;
      const next = classrooms;

      // Avoid syncing if unchanged
      if (JSON.stringify(prev) === JSON.stringify(next)) return;

      setSyncing(true);
      try {
        // Find deleted classrooms
        const deleted = prev.filter(p => !next.some(n => n.id === p.id));
        for (const classroom of deleted) {
          await deleteClassroomFromCloud(classroom.id);
        }

        // Find created or updated classrooms
        for (const classroom of next) {
          const oldClassroom = prev.find(p => p.id === classroom.id);
          if (!oldClassroom || JSON.stringify(oldClassroom) !== JSON.stringify(classroom)) {
            await saveClassroomToCloud(classroom, user.uid);
          }
        }
      } catch (err) {
        console.error('Failed to sync changes with cloud', err);
      } finally {
        setSyncing(false);
      }
    };

    syncWithCloud();
    prevClassroomsRef.current = classrooms;
  }, [classrooms, user, authLoading]);

  const updateClassrooms = (updater: (prev: Classroom[]) => Classroom[]) => {
    setClassrooms((prev) => {
      const next = updater(prev);
      saveClassroomsToStorage(next);
      return next;
    });
  };

  const handleMergeLocalData = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const localClassrooms = JSON.parse(savedData);
        if (Array.isArray(localClassrooms) && localClassrooms.length > 0) {
          await mergeLocalClassroomsToCloud(localClassrooms, user.uid);
          // Reload from cloud
          const cloudClassrooms = await getClassroomsFromCloud(user.uid);
          setClassrooms(cloudClassrooms);
          prevClassroomsRef.current = cloudClassrooms;
          if (cloudClassrooms.length > 0) {
            setActiveClassroomId(cloudClassrooms[0].id);
          }
          // Clear local data after successful merge
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setHasLocalData(false);
          alert('🎉 恭喜，本地班级和学生数据已成功合并并同步至云端！');
        }
      }
    } catch (err) {
      console.error('Failed to merge local data', err);
      alert('合并数据失败，请重试');
    } finally {
      setSyncing(false);
    }
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

  // Bulk student importing
  const handleAddStudentsBatch = (studentsList: { name: string; notes?: string; tags?: string[] }[]) => {
    if (studentsList.length === 0) return;

    const newStudents: Student[] = studentsList.map((s) => ({
      id: `stud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 1000)}`,
      name: s.name.trim(),
      notes: s.notes?.trim() || '',
      count: 0,
      tags: s.tags || [],
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

  const handleClearAllStudents = () => {
    updateClassrooms((prev) =>
      prev.map((c) => {
        if (c.id === activeClassroomId) {
          return {
            ...c,
            students: [],
          };
        }
        return c;
      })
    );
    if (soundEnabled) playBeep(250, 0.25);
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
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-1.5 flex-wrap">
                课堂点名记数器
                {user ? (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    云端同步中
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    本地存储模式
                  </span>
                )}
                {syncing && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                    正在同步...
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500">高效记录点名提问，助推课堂多维公平</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cloud Sync Auth Button */}
            {user ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold transition-all"
              >
                <Cloud size={14} className="text-emerald-500" />
                <span className="max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Cloud size={14} />
                <span>登录云端同步</span>
              </button>
            )}

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
                onClearAllStudents={handleClearAllStudents}
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
      </main>

      {/* Quick Stats Footer matching style */}
      <footer className="mt-auto h-12 bg-slate-800 text-slate-400 flex items-center px-8 text-xs gap-6 rounded-t-xl max-w-7xl mx-auto w-full">
        <span className="flex items-center gap-1.5">
          {user ? (
            <>
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              云端数据安全同步已开启
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              本地存储模式 (换设备数据会丢失)
            </>
          )}
        </span>
        <span>当前状态: {user ? '多端共享中' : '离线存储'}</span>
        {user && (
          <span className="ml-auto flex items-center gap-1">
            <Cloud size={12} className="text-emerald-400" /> 
            安全备份: {user.email}
          </span>
        )}
      </footer>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            user={user}
            onClose={() => setShowAuthModal(false)}
            onMergeLocalData={handleMergeLocalData}
            hasLocalData={hasLocalData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
