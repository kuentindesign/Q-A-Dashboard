import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { LogIn, UserPlus, LogOut, ShieldCheck, Mail, Lock, RefreshCw, AlertCircle, Cloud, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthModalProps {
  user: User | null;
  onClose: () => void;
  onMergeLocalData: () => void;
  hasLocalData: boolean;
}

export default function AuthModal({ user, onClose, onMergeLocalData, hasLocalData }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('登录成功！');
        setTimeout(() => onClose(), 1000);
      } else {
        if (password.length < 6) {
          throw new Error('密码长度至少为 6 位');
        }
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg('注册成功！');
        setTimeout(() => onClose(), 1000);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = '操作失败，请重试';
      if (err.code === 'auth/wrong-password') {
        errMsg = '密码错误，请重试';
      } else if (err.code === 'auth/user-not-found') {
        errMsg = '该邮箱未注册，请先注册';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = '该邮箱已被注册，请直接登录';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = '邮箱格式不正确';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setSuccessMsg('已退出登录');
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setError('退出登录失败');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      // Configure to select account (optional but good practice)
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setSuccessMsg('Google 登录成功！');
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      let errMsg = 'Google 登录失败，请重试';
      if (err.code === 'auth/popup-blocked') {
        errMsg = '登录窗口被浏览器拦截，请允许弹出窗口并重试';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errMsg = '登录窗口已被关闭';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        {/* Top Header Graphic/Title */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={24} className="animate-pulse" />
            <span className="text-xs uppercase tracking-widest opacity-80 font-mono">云端同步中心</span>
          </div>
          <h2 className="text-xl font-bold">
            {user ? '您的云端帐号' : isLogin ? '登录您的教师帐号' : '注册教师帐号'}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            {user 
              ? '支持多设备、换电脑实时数据保存与安全备份' 
              : '注册登录后，您的班级及学生点名数据将安全同步到云端，多设备实时共享。'}
          </p>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-all"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex gap-2 items-start animate-shake">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-3 rounded-xl text-xs flex gap-2 items-center">
              <ShieldCheck size={16} className="shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {user ? (
            // Logged In Status
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">当前登录邮箱</span>
                  <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg text-[10px]">已联机</span>
                </div>
                <p className="text-sm font-mono font-bold text-slate-800 break-all">{user.email}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  您的所有班级和学生数据正在后台安全同步到云端。
                </p>
              </div>

              {hasLocalData && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle size={14} />
                    检测到您有尚未上传的本地数据
                  </h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    您在登录前创建的本地班级数据，可以一键上传并合并到此云端帐号中。
                  </p>
                  <button
                    onClick={() => {
                      onMergeLocalData();
                      onClose();
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} />
                    <span>一键合并本地数据到云端</span>
                  </button>
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mt-4"
              >
                <LogOut size={14} />
                <span>退出登录</span>
              </button>
            </div>
          ) : (
            // Form to Login or Register with Google Sign-In at the top
            <div className="space-y-4">
              {/* Google Sign-In - Recommended & Fully Enabled */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50/50 px-2.5 py-1.5 rounded-lg border border-emerald-100/50">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  推荐使用：项目已启用 Google 一键联机
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold rounded-2xl text-xs shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin text-slate-400" />
                  ) : (
                    <Chrome size={16} className="text-blue-500 shrink-0" />
                  )}
                  <span>使用 Google 账号一键登录 / 注册</span>
                </button>
              </div>

              {/* Decorative Divider */}
              <div className="flex items-center gap-2 py-1 text-slate-300">
                <div className="h-px bg-slate-100 flex-1"></div>
                <span className="text-[10px] text-slate-400 font-medium">或者</span>
                <div className="h-px bg-slate-100 flex-1"></div>
              </div>

              {/* Form to Login or Register with Email */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Mail size={12} />
                    电子邮箱 (Email)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="请输入您的邮箱..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Lock size={12} />
                    密码 (Password)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="请输入 6 位及以上密码..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : isLogin ? (
                    <>
                      <LogIn size={14} />
                      <span>确认登录 (邮箱)</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>注册新帐号 (邮箱)</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {isLogin ? '还没有邮箱账号？立即注册' : '已有邮箱账号？直接登录'}
                  </button>
                </div>

                {/* Friendly explanation about operation-not-allowed */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed space-y-1">
                  <p className="font-bold text-slate-600 flex items-center gap-1">
                    <AlertCircle size={12} className="text-blue-500 shrink-0" />
                    登录故障提示：
                  </p>
                  <p>
                    若注册邮箱时出现 <code className="text-rose-600 font-mono bg-rose-50 px-1 py-0.5 rounded">auth/operation-not-allowed</code> 报错，代表您的 Firebase 控制台<b>邮箱登录通道未开启</b>。
                  </p>
                  <p className="text-emerald-700 font-bold">
                    这是正常限制，请直接点击顶部的【使用 Google 账号一键登录】即可完美登录并同步数据！
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
