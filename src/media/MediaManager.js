// MediaManager.js - File Upload and Management Module
import React, { useState, useCallback } from 'react';
import { Upload, Copy, Check, AlertCircle, FileVideo, Trash2 } from 'lucide-react';

// Utility function to generate NLE-friendly IDs
export const generateMediaId = (storyType = 'PKG', date = new Date()) => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${storyType}_${dateStr}_${timeStr}_${randomSuffix}`;
};

// Hook for Firebase Storage operations
export const useMediaStorage = (db) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadVideo = useCallback(async (file, mediaId) => {
    if (!db) throw new Error('Database not initialized');
    
    setUploading(true);
    setProgress(0);

    try {
      // Dynamic import for Firebase Storage
      const { getStorage, ref, uploadBytesResumable, getDownloadURL } = 
        await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js");
      
      const storage = getStorage();
      const storageRef = ref(storage, `media/${mediaId}.mp4`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(progress);
          },
          (error) => {
            setUploading(false);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploading(false);
            resolve(downloadURL);
          }
        );
      });
    } catch (error) {
      setUploading(false);
      throw error;
    }
  }, [db]);

  const deleteVideo = useCallback(async (mediaId) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
      const { getStorage, ref, deleteObject } = 
        await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js");
      
      const storage = getStorage();
      const storageRef = ref(storage, `media/${mediaId}.mp4`);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }, [db]);

  return { uploadVideo, deleteVideo, uploading, progress };
};

// Media Upload Component
const MediaUpload = ({ mediaId, onUploadComplete, onUploadError, db }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { uploadVideo, uploading, progress } = useMediaStorage(db);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      onUploadError?.('Please select a video file');
      return;
    }

    // Validate file size (limit to 100MB for proxy files)
    if (file.size > 100 * 1024 * 1024) {
      onUploadError?.('File size should be less than 100MB for proxy files');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const downloadURL = await uploadVideo(selectedFile, mediaId);
      onUploadComplete?.(downloadURL, {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        uploadDate: new Date().toISOString()
      });
      setSelectedFile(null);
    } catch (error) {
      onUploadError?.(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <FileVideo className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">
          Drop video file for: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{mediaId}</code>
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop your video file here, or click to select
        </p>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileInput}
          className="hidden"
          id={`file-upload-${mediaId}`}
        />
        <label 
          htmlFor={`file-upload-${mediaId}`}
          className="btn-primary cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Select Video File
        </label>
      </div>

      {selectedFile && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{selectedFile.name}</span>
            <span className="text-sm text-gray-500">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          {uploading ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">Uploading... {Math.round(progress)}%</p>
            </div>
          ) : (
            <button onClick={handleUpload} className="btn-primary w-full">
              Upload Video
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ID Copy Component
const MediaIdDisplay = ({ mediaId, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mediaId);
      setCopied(true);
      onCopy?.(mediaId);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <code className="flex-1 font-mono text-sm">{mediaId}</code>
      <button
        onClick={handleCopy}
        className={`p-2 rounded transition-colors ${
          copied 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
        }`}
        title="Copy ID for NLE export"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

// Media Status Component
const MediaStatus = ({ mediaId, videoUrl, metadata, onDelete, db }) => {
  const [deleting, setDeleting] = useState(false);
  const { deleteVideo } = useMediaStorage(db);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video file?')) return;
    
    setDeleting(true);
    try {
      await deleteVideo(mediaId);
      onDelete?.(mediaId);
    } catch (error) {
      console.error('Error deleting video:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (!videoUrl) {
    return (
      <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">No video file attached</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm">Video file attached</span>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
          title="Delete video file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {metadata && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>File: {metadata.fileName}</div>
          <div>Size: {(metadata.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
          <div>Uploaded: {new Date(metadata.uploadDate).toLocaleString()}</div>
        </div>
      )}
    </div>
  );
};

export { MediaUpload, MediaIdDisplay, MediaStatus };
