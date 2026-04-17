import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [activeNav, setActiveNav] = useState(1);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showText, setShowText] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sidebarExpanded) {
      timerRef.current = setTimeout(() => {
        setShowText(true);
      }, 300);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setShowText(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [sidebarExpanded]);

  async function greet(e: React.FormEvent) {
    e.preventDefault();
    const result = await invoke<string>("greet", { name });
    setMessage(result);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* 左侧菜单栏 - 可展开 */}
      <aside
        className={`bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col py-4 border-r border-blue-100 transition-all duration-300 ${
          sidebarExpanded ? "w-48" : "w-16"
        }`}
      >
        {/* 顶部功能图标 */}
        <div className="flex-1 flex flex-col space-y-2 px-3">
          {/* Logo */}
          <div className="relative group">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className={`h-10 rounded-xl flex items-center justify-center transition-all duration-200 w-full ${
                sidebarExpanded
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              {showText ? (
                <span className="text-lg font-bold whitespace-nowrap">Natsu</span>
              ) : (
                <>
                  <span className="text-lg font-bold group-hover:hidden">N</span>
                  <svg className="w-5 h-5 hidden group-hover:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </>
              )}
            </button>
            {!sidebarExpanded && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                展开侧边栏
              </div>
            )}
          </div>

          {/* 菜单项 */}
          <button
            onClick={() => setActiveNav(1)}
            className={`h-10 rounded-xl flex items-center transition-colors w-full ${
              activeNav === 1
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0 ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {showText && <span className="ml-3 whitespace-nowrap">首页</span>}
          </button>
          <button
            onClick={() => setActiveNav(2)}
            className={`h-10 rounded-xl flex items-center transition-colors w-full ${
              activeNav === 2
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0 ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {showText && <span className="ml-3 whitespace-nowrap">消息</span>}
          </button>
          <button
            onClick={() => setActiveNav(3)}
            className={`h-10 rounded-xl flex items-center transition-colors w-full ${
              activeNav === 3
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0 ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {showText && <span className="ml-3 whitespace-nowrap">文件</span>}
          </button>
          <button
            onClick={() => setActiveNav(4)}
            className={`h-10 rounded-xl flex items-center transition-colors w-full ${
              activeNav === 4
                ? "bg-blue-500 text-white shadow-md"
                : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0 ml-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showText && <span className="ml-3 whitespace-nowrap">设置</span>}
          </button>
        </div>

        {/* 底部用户登录图标 */}
        <div className="mt-auto px-3">
          <button className={`h-10 rounded-xl flex items-center font-medium hover:bg-blue-50 transition-all w-full text-gray-500 hover:text-blue-600 ${
            sidebarExpanded ? "justify-start px-2" : "justify-center mx-auto"
          }`}>
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {showText && <span className="ml-3 whitespace-nowrap">登录</span>}
          </button>
        </div>
      </aside>

      {/* 中间主内容区 - 卡片形式 */}
      <main className="flex-1 p-3">
        <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">
            Welcome to Natsu!
          </h1>

          <form onSubmit={greet} className="flex gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name..."
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Greet
            </button>
          </form>

          {message && (
            <p className="text-lg text-gray-600">{message}</p>
          )}
        </div>
      </main>

      {/* 右侧栏 - 卡片形式 */}
      <aside className="w-64 p-3">
        <div className="h-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            信息面板
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-500">状态</p>
              <p className="text-gray-800 font-medium">运行中</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-500">版本</p>
              <p className="text-gray-800 font-medium">0.1.0</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;
