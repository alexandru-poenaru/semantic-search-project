'use client';

import { useState, useEffect } from 'react';

type Category = { id: number; name: string };
type SearchResult = { id: number; content: string; similarity: number; metadata: any };

export default function SearchForm() {
  // --- STATE (New Logic) ---
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]); // Array for Multi-select
  
  const [aiAnswer, setAiAnswer] = useState<string>(""); // New: AI Answer
  const [results, setResults] = useState<SearchResult[]>([]); // New: These are now "Sources"
  
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // Toggle Logic (New)
  const toggleCategory = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setAiAnswer("");
    setResults([]);
    setHasSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Sending Array of IDs
        body: JSON.stringify({ query, categoryIds: selectedIds }),
      });
      const data = await res.json();
      
      // Handle the new response format (Answer + Sources)
      if (data.answer) {
        setAiAnswer(data.answer);
        setResults(data.sources || []);
      }
    } catch (err) {
      console.error(err);
      setAiAnswer("Something went wrong. Please check the console.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      
      {/* Search Bar Section (Old Container Styling) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-4">
          
          {/* Input & Button Row */}
          <div className="flex flex-col gap-4 md:flex-row">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />

            <button 
              type="submit" 
              disabled={searching}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              {searching ? "Thinking..." : "Search"}
            </button>
          </div>

          {/* Categories (New Logic adapted to fit the Old aesthetic) */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
             <button
              type="button"
              onClick={() => setSelectedIds([])}
              className={`
                px-3 py-1 text-sm rounded-full border transition-all
                ${selectedIds.length === 0 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}
              `}
            >
              All Folders
            </button>
            {categories.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`
                    px-3 py-1 text-sm rounded-full border transition-all
                    ${isSelected 
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-medium' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}
                  `}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* --- NEW: AI Answer Section --- */}
      {aiAnswer && (
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm animate-fade-in">
          <h3 className="flex items-center gap-2 text-sm font-bold text-blue-800 uppercase tracking-widest mb-3">
            <span className="text-xl">🤖</span> AI Answer
          </h3>
          <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
            {aiAnswer}
          </div>
        </div>
      )}

      {/* Results Section (Sources) - EXACT Old Styling */}
      <div className="space-y-6">
        {results.length > 0 && (
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">
            Sources Used ({results.length})
          </h3>
        )}
        
        {results.map((r, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition-colors group">
            
            {/* Header: Score & Filename */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                  {Math.round(r.similarity * 100)}% Match
                </span>
                <span className="text-xs text-gray-400">
                  ID: {r.id || "N/A"}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                📄 {r.metadata?.filename || "Unknown Source"}
              </span>
            </div>

            {/* Content Body */}
            <p className="text-gray-800 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {r.content}
            </p>
            
          </div>
        ))}

        {/* Empty State */}
        {!searching && hasSearched && results.length === 0 && !aiAnswer && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="text-4xl mb-4">🤷‍♂️</div>
            <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
            <p className="text-gray-500">Try adjusting your question or selecting "All Folders".</p>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="text-center mt-20 opacity-50">
            <div className="text-6xl mb-6 grayscale">🧠</div>
            <p className="text-gray-400">Select a folder and ask away.</p>
          </div>
        )}
      </div>
    </div>
  );
}