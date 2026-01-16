'use client';

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import FileUploader from "@/components/FileUploader";
import FileManager from "@/components/FileManager";
import SearchForm from "@/components/SearchForm"; // Uncomment when you have this back!

type View = 'search' | 'upload' | 'library';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('upload'); // Default to upload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 h-full overflow-y-auto p-8 relative content-center">
        <div className="max-w-4xl mx-auto">
          
          <header className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeView === 'search' && "Ask your Brain"}
              {activeView === 'upload' && "Feed the Brain"}
              {activeView === 'library' && "Manage Memories"}
            </h2>
            <p className="text-gray-500 text-sm">
              {activeView === 'search' && "Search through your documents and ask questions."}
              {activeView === 'upload' && "Upload PDF, DOCX, MD, or JSON files to index them."}
              {activeView === 'library' && "Organize, move, or delete your ingested files."}
            </p>
          </header>

          <div className="transition-opacity duration-300 ease-in-out">
            
            {activeView === 'search' && (
               <SearchForm /> 
            )}

            {activeView === 'upload' && (
              <FileUploader onUploadSuccess={handleUploadSuccess} />
            )}

            {activeView === 'library' && (
              <FileManager refreshTrigger={refreshTrigger} />
            )}

          </div>

        </div>
      </main>
    </div>
  );
}