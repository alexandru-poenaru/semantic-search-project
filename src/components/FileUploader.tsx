'use client';

import { useState, useEffect } from 'react';

type Category = {
  id: number;
  name: string;
};

type Props = {
  onUploadSuccess?: () => void;
};

export default function FileUploader({ onUploadSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) setSelectedCategoryId(data[0].id.toString());
      }
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) return;
    try {
      await fetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName }),
      });
      setNewCategoryName("");
      await fetchCategories();
    } catch (e) {
      console.error("Failed to create category", e);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedCategoryId) {
      setStatus("❌ Please select a file and a folder.");
      return;
    }

    setUploading(true);
    setStatus("⏳ Parsing and embedding... (Check VS Code terminal for details)");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoryId", selectedCategoryId);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await response.json();
      setStatus(`✅ Success! Processed ${data.chunksProcessed} chunks from "${file.name}".`);
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      
      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Step 1: Select Destination Folder
        </label>
        
        <div className="flex gap-2 mb-2">
          <select 
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {categories.length === 0 && <option>No folders yet...</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <input 
            type="text" 
            placeholder="Or create new folder..." 
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 text-sm p-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none text-gray-900"
          />
          <button 
            onClick={handleCreateCategory}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-black transition-colors"
          >
            + Create
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 my-6"></div>

      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Step 2: Choose Document
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              onChange={(e) => {
                if (e.target.files) {
                    setFile(e.target.files[0]);
                    setStatus("");
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".txt,.md,.pdf,.docx,.json,.csv,.xlsx"
            />
            <div className="pointer-events-none">
                {file ? (
                    <p className="text-green-600 font-medium">📄 {file.name}</p>
                ) : (
                    <p className="text-gray-500">Drag & drop or click to upload</p>
                )}
            </div>
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || !file || !selectedCategoryId}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all
          ${uploading || !file 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
          }`}
      >
        {uploading ? "Ingesting Knowledge..." : "Upload to Brain 🧠"}
      </button>

      {status && (
        <div className={`mt-4 p-3 rounded-lg text-sm text-center font-medium
          ${status.includes("✅") ? "bg-green-50 text-green-700" : 
            status.includes("❌") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}
        >
          {status}
        </div>
      )}
    </div>
  );
}