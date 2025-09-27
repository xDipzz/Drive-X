"use client";

import { useState, useEffect } from "react";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  mimeType?: string;
  content?: string; // Base64 encoded file content for small files
  parentId?: string;
  createdAt: string;
  modifiedAt: string;
}

interface DriveData {
  files: FileItem[];
  currentFolderId: string | null;
}

export function DriveX() {
  const [driveData, setDriveData] = useState<DriveData>({
    files: [],
    currentFolderId: null,
  });
  const [currentPath, setCurrentPath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("driveX-data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setDriveData(parsed);
      } catch (error) {
        console.error("Error loading saved data:", error);
      }
    }
    setLoading(false);
  }, []);

  // Save data to localStorage whenever driveData changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("driveX-data", JSON.stringify(driveData));
    }
  }, [driveData, loading]);

  // Get current folder items
  const getCurrentItems = () => {
    return driveData.files.filter(item => 
      (driveData.currentFolderId === null && item.parentId === undefined) ||
      item.parentId === driveData.currentFolderId
    );
  };

  // Get filtered items based on search
  const getFilteredItems = () => {
    const currentItems = getCurrentItems();
    if (!searchTerm) return currentItems;
    return currentItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string, folderName: string) => {
    setDriveData(prev => ({ ...prev, currentFolderId: folderId }));
    updateCurrentPath(folderId);
  };

  // Navigate back
  const navigateBack = () => {
    const currentFolder = driveData.files.find(f => f.id === driveData.currentFolderId);
    const parentId = currentFolder?.parentId || null;
    setDriveData(prev => ({ ...prev, currentFolderId: parentId }));
    updateCurrentPath(parentId);
  };

  // Update current path display
  const updateCurrentPath = (folderId: string | null) => {
    if (!folderId) {
      setCurrentPath("/");
      return;
    }
    
    const buildPath = (id: string): string => {
      const folder = driveData.files.find(f => f.id === id);
      if (!folder || !folder.parentId) return `/${folder?.name || ""}`;
      return buildPath(folder.parentId) + `/${folder.name}`;
    };
    
    setCurrentPath(buildPath(folderId));
  };

  // Create new folder
  const createFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName || !folderName.trim()) return;

    const newFolder: FileItem = {
      id: Date.now().toString(),
      name: folderName.trim(),
      type: "folder",
      parentId: driveData.currentFolderId || undefined,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    setDriveData(prev => ({
      ...prev,
      files: [...prev.files, newFolder]
    }));
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    try {
      // For demo purposes, we'll store small files as base64
      // In a real app, you'd upload to a server or use File API
      let content = "";
      if (file.size < 1024 * 1024) { // Only store files smaller than 1MB
        const reader = new FileReader();
        content = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      const newFile: FileItem = {
        id: Date.now().toString(),
        name: file.name,
        type: "file",
        size: file.size,
        mimeType: file.type,
        content: content,
        parentId: driveData.currentFolderId || undefined,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };

      setDriveData(prev => ({
        ...prev,
        files: [...prev.files, newFile]
      }));
    } catch (error) {
      alert("Failed to upload file: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Handle file drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0 && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  // Handle file select
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  // Download file
  const downloadFile = (file: FileItem) => {
    if (file.content) {
      // Download from stored content
      const link = document.createElement("a");
      link.href = file.content;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("File content not available for download (file too large or not stored)");
    }
  };

  // Delete item
  const deleteItem = (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    // If deleting a folder, also delete all its contents
    const deleteRecursive = (itemId: string): string[] => {
      const children = driveData.files.filter(f => f.parentId === itemId);
      const childIds: string[] = [];
      children.forEach(child => {
        childIds.push(child.id);
        childIds.push(...deleteRecursive(child.id));
      });
      return childIds;
    };

    const item = driveData.files.find(f => f.id === id);
    const idsToDelete = [id];
    
    if (item?.type === "folder") {
      idsToDelete.push(...deleteRecursive(id));
    }

    setDriveData(prev => ({
      ...prev,
      files: prev.files.filter(f => !idsToDelete.includes(f.id))
    }));
  };

  // Export data as JSON
  const exportData = () => {
    const dataStr = JSON.stringify(driveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `driveX-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from JSON
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.files && Array.isArray(imported.files)) {
          setDriveData(imported);
          alert("Data imported successfully!");
        } else {
          alert("Invalid backup file format");
        }
      } catch (error) {
        alert("Error importing data: " + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  // Clear all data
  const clearAllData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone!")) {
      setDriveData({ files: [], currentFolderId: null });
      setCurrentPath("/");
      localStorage.removeItem("driveX-data");
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon
  const getFileIcon = (file: FileItem): string => {
    if (file.type === "folder") return "📁";
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.mimeType || "";
    
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.startsWith("text/") || ["txt", "md", "json"].includes(ext || "")) return "📝";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) return "📦";
    if (["js", "ts", "jsx", "tsx", "html", "css", "py", "java"].includes(ext || "")) return "💻";
    return "📄";
  };

  const filteredItems = getFilteredItems();
  const totalFiles = driveData.files.filter(f => f.type === "file").length;
  const totalFolders = driveData.files.filter(f => f.type === "folder").length;
  const totalSize = driveData.files
    .filter(f => f.type === "file" && f.size)
    .reduce((sum, f) => sum + (f.size || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Drive-X...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="text-4xl">🚀</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Drive-X</h1>
                <p className="text-gray-600">Modern File Storage • LocalStorage Based</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 text-right">
                <div>{totalFiles} files • {totalFolders} folders</div>
                <div>{formatFileSize(totalSize)} total</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">📍</span>
              <span className="font-mono text-gray-700">{currentPath}</span>
              {driveData.currentFolderId && (
                <button
                  onClick={navigateBack}
                  className="ml-4 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  ← Back
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
              ${dragOver 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
              }
              ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
            `}
          >
            <input
              type="file"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            
            {uploading ? (
              <div className="space-y-3">
                <div className="text-4xl">⏳</div>
                <div className="font-medium text-blue-600">Uploading...</div>
                <div className="w-32 mx-auto bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl">📤</div>
                <div className="font-medium text-gray-700">
                  {dragOver ? "Drop your file here!" : "Click or drag files to upload"}
                </div>
                <div className="text-sm text-gray-500">
                  Files under 1MB will be stored locally
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={createFolder}
              disabled={uploading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 transition-colors flex items-center space-x-2"
            >
              <span>📁</span>
              <span>New Folder</span>
            </button>
            
            <button
              onClick={exportData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <span>💾</span>
              <span>Export Backup</span>
            </button>
            
            <label className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2 cursor-pointer">
              <span>📥</span>
              <span>Import Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
            
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <span>🗑️</span>
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-lg">
          {filteredItems.length > 0 ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                📂 {searchTerm ? `Search Results (${filteredItems.length})` : `Current Folder (${filteredItems.length})`}
              </h3>
              <div className="grid gap-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => item.type === "folder" ? navigateToFolder(item.id, item.name) : undefined}
                    >
                      <span className="text-2xl">{getFileIcon(item)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.type === "file" && item.size && `${formatFileSize(item.size)} • `}
                          {new Date(item.createdAt).toLocaleDateString()}
                          {item.type === "folder" && " • Folder"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.type === "file" && (
                        <button
                          onClick={() => downloadFile(item)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                        >
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">
                {searchTerm ? "🔍" : "📁"}
              </div>
              <div className="text-xl font-medium mb-2">
                {searchTerm ? "No files found" : "This folder is empty"}
              </div>
              <div className="text-sm">
                {searchTerm ? "Try a different search term" : "Upload files or create folders to get started"}
              </div>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-100 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-blue-800">
            <strong>🔒 Privacy First:</strong> All your files are stored locally in your browser using localStorage. 
            No data is sent to any servers. You can export your data as JSON for backup purposes.
          </div>
        </div>
      </div>
    </div>
  );
}
