type View = 'search' | 'upload' | 'library';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'search', label: 'Chat & Search', icon: '🔍' },
    { id: 'upload', label: 'Upload Files', icon: '📄' },
    { id: 'library', label: 'Knowledge Base', icon: '🗂️' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col h-screen shrink-0 transition-all duration-300">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Local<span className="text-blue-500">Brain</span> 🧠
        </h1>
        <p className="text-xs text-gray-500 mt-1">Private AI Workspace</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
              ${activeView === item.id 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'hover:bg-gray-800 hover:text-white'
              }
            `}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
        v1.0 • Running Locally
      </div>
    </aside>
  );
}