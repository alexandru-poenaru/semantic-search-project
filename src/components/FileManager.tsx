'use client';

import { useState, useEffect } from 'react';

type Category = { id: number; name: string };
type Doc = { id: number; filename: string; category_id: number; category_name: string; created_at: string; chunk_count: number };
type Props = {
  refreshTrigger?: number;
};

export default function FileManager({ refreshTrigger = 0 }: Props) {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track which folder is being hovered over (for visual feedback)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const [docsRes, catsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/categories')
      ]);

      if (docsRes.ok && catsRes.ok) {
        const docs = await docsRes.json();
        const cats = await catsRes.json();
        setDocuments(Array.isArray(docs) ? docs : []);
        setCategories(Array.isArray(cats) ? cats : []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDoc = async (filename: string, categoryId: number) => {
    if (!confirm(`Delete "${filename}" permanently?`)) return;
    
    // Optimistic Update: Remove it from UI immediately for speed
    setDocuments(prev => prev.filter(d => !(d.filename === filename && d.category_id === categoryId)));

    await fetch('/api/documents', {
      method: 'DELETE',
      body: JSON.stringify({ filename, categoryId }),
    });
    fetchData(); // Sync to be sure
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("WARNING: This will delete the folder AND ALL files inside it. Continue?")) return;
    await fetch('/api/categories', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  // --- DRAG AND DROP LOGIC ---

  const handleDragStart = (e: React.DragEvent, doc: Doc) => {
    // Pack the data we need to move the file
    e.dataTransfer.setData("application/json", JSON.stringify({
      filename: doc.filename,
      currentCategoryId: doc.category_id
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, categoryId: number) => {
    e.preventDefault(); // Necessary to allow dropping
    setDragOverCategoryId(categoryId); // Highlight this folder
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCategoryId(null); // Remove highlight
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: number) => {
    e.preventDefault();
    setDragOverCategoryId(null);

    const dataString = e.dataTransfer.getData("application/json");
    if (!dataString) return;

    const { filename, currentCategoryId } = JSON.parse(dataString);

    // Don't do anything if dropped in the same folder
    if (currentCategoryId === targetCategoryId) return;

    // 1. Optimistic UI Update (Move it visually instantly)
    setDocuments(prev => prev.map(d => {
      if (d.filename === filename && d.category_id === currentCategoryId) {
        return { ...d, category_id: targetCategoryId };
      }
      return d;
    }));

    // 2. Send API Request
    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        body: JSON.stringify({ filename, currentCategoryId, newCategoryId: targetCategoryId }),
      });
      if (!res.ok) throw new Error("Move failed");
    } catch (err) {
      alert("Failed to move file.");
      fetchData(); // Revert on error
    }
  };

  if (loading) return <div className="text-center p-4 text-gray-500">Loading...</div>;

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6">📂 Knowledge Base Manager</h2>
      <p className="text-sm text-gray-400 mb-4">Drag files between folders to organize them.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map(cat => {
          const catDocs = documents.filter(d => d.category_id === cat.id);
          const isDragOver = dragOverCategoryId === cat.id;
          
          return (
            <div 
              key={cat.id}
              // Make the Category Box a Drop Zone
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, cat.id)}
              className={`
                border rounded-xl overflow-hidden transition-all duration-200
                ${isDragOver ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 bg-gray-50'}
              `}
            >
              {/* Category Header */}
              <div className="p-3 flex justify-between items-center border-b border-gray-200 bg-white/50">
                <h3 className={`font-semibold ${isDragOver ? 'text-blue-700' : 'text-gray-700'}`}>
                  {cat.name} <span className="text-xs font-normal text-gray-400">({catDocs.length})</span>
                </h3>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2"
                >
                  Delete
                </button>
              </div>

              {/* Files List */}
              <div className="min-h-[100px] p-2 space-y-2">
                {catDocs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs italic py-4 pointer-events-none">
                    Drop files here
                  </div>
                )}
                
                {catDocs.map((doc, index) => (
                  <div 
                    key={index}
                    draggable // <--- MAGIC ENABLED
                    onDragStart={(e) => handleDragStart(e, doc)}
                    className="
                      group flex justify-between items-center p-3 
                      bg-white border border-gray-100 rounded-lg shadow-sm 
                      cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition
                    "
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xl select-none shrink-0 whitespace-nowrap">:: 📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate pr-2">
                          {doc.filename || "Untitled"}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {doc.chunk_count} chunks • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteDoc(doc.filename, doc.category_id)}
                      className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                      title="Delete File"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}