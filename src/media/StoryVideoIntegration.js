// StoryVideoIntegration.js - Integration Module for Existing App
import React, { useState, useEffect } from 'react';
import { FileVideo, Upload, Eye, Settings } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { MediaUpload, MediaIdDisplay, MediaStatus, generateMediaId, useMediaStorage } from './MediaManager';

// Enhanced Story Card with Video Integration
const StoryWithVideo = ({ 
  story, 
  onStoryUpdate, 
  onVideoAttached, 
  onVideoDetached,
  db,
  expanded = false,
  showVideoControls = true 
}) => {
  const [mediaData, setMediaData] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate or get existing media ID
  const mediaId = story.mediaId || generateMediaId(story.type?.[0] || 'PKG');

  // Fetch media data when component mounts
  useEffect(() => {
    if (story.videoUrl) {
      // If story already has video URL, fetch metadata
      fetchMediaMetadata();
    }
  }, [story.videoUrl]);

  const fetchMediaMetadata = async () => {
    try {
      // Fetch metadata from Firebase if stored
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      const mediaDoc = await getDoc(doc(db, "media", mediaId));
      if (mediaDoc.exists()) {
        setMediaData(mediaDoc.data());
      }
    } catch (error) {
      console.error('Error fetching media metadata:', error);
    }
  };

  const handleUploadComplete = async (videoUrl, metadata) => {
    setLoading(true);
    try {
      // Save metadata to Firebase
      const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      await setDoc(doc(db, "media", mediaId), {
        ...metadata,
        mediaId,
        storyId: story.id,
        videoUrl
      });

      // Update story with video URL and media ID
      const updatedStory = {
        ...story,
        videoUrl,
        mediaId,
        hasVideo: true
      };
      
      onStoryUpdate(updatedStory);
      onVideoAttached?.(story.id, videoUrl, mediaId);
      setMediaData({ ...metadata, videoUrl });
      setShowUploader(false);
    } catch (error) {
      console.error('Error saving media data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error}`);
  };

  const handleVideoDelete = async () => {
    try {
      // Remove from Firebase media collection
      const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      await deleteDoc(doc(db, "media", mediaId));

      // Update story to remove video
      const updatedStory = {
        ...story,
        videoUrl: null,
        hasVideo: false
      };
      
      onStoryUpdate(updatedStory);
      onVideoDetached?.(story.id, mediaId);
      setMediaData(null);
    } catch (error) {
      console.error('Error removing video:', error);
    }
  };

  const handleCopyId = (id) => {
    console.log(`Media ID copied: ${id}`);
    // You can add toast notification here
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
      {/* Video Player Section */}
      {story.videoUrl && expanded && (
        <div className="relative">
          <VideoPlayer
            src={story.videoUrl}
            title={story.title}
            height="300px"
            onTimeUpdate={(time) => {
              // You can sync this with rundown timing
              console.log('Video time:', time);
            }}
          />
        </div>
      )}

      <div className="p-6">
        {/* Story Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{story.title}</h3>
          <div className="flex items-center space-x-2">
            {story.type?.map(type => (
              <span key={type} className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                {type}
              </span>
            ))}
            {story.hasVideo && (
              <FileVideo className="w-5 h-5 text-green-500" title="Video attached" />
            )}
          </div>
        </div>

        {/* Media ID Display */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            NLE Export ID
          </label>
          <MediaIdDisplay mediaId={mediaId} onCopy={handleCopyId} />
        </div>

        {/* Media Status */}
        <div className="mb-4">
          <MediaStatus
            mediaId={mediaId}
            videoUrl={story.videoUrl}
            metadata={mediaData}
            onDelete={handleVideoDelete}
            db={db}
          />
        </div>

        {/* Video Controls */}
        {showVideoControls && (
          <div className="flex space-x-2 mb-4">
            {!story.videoUrl && (
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="btn-primary text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Video
              </button>
            )}
            
            {story.videoUrl && !expanded && (
              <button
                onClick={() => {/* Toggle expanded view */}}
                className="btn-secondary text-sm"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            )}
          </div>
        )}

        {/* Upload Interface */}
        {showUploader && !story.videoUrl && (
          <div className="border-t pt-4">
            <MediaUpload
              mediaId={mediaId}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              db={db}
            />
          </div>
        )}

        {/* Story Content */}
        <div className="text-gray-600 dark:text-gray-300 text-sm">
          {story.content?.substring(0, 200)}
          {story.content?.length > 200 && '...'}
        </div>
      </div>
    </div>
  );
};

// Rundown Item with Video Integration
const RundownItemWithVideo = ({ 
  item, 
  story, 
  onItemUpdate, 
  db,
  isLive = false 
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const mediaId = story?.mediaId || item.mediaId;
  const videoUrl = story?.videoUrl || item.videoUrl;

  return (
    <div className={`p-4 border-b ${isLive ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gray-100 dark:bg-gray-600">
              {item.id}
            </div>
            {videoUrl && (
              <FileVideo className="w-4 h-4 text-green-500 mt-1" title="Video attached" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium">{item.title}</h4>
              <div className="flex gap-1">
                {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                  <span key={t} className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Duration: {item.duration}
              {mediaId && (
                <span className="ml-4">
                  ID: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{mediaId}</code>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {videoUrl && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-500 hover:text-blue-600 rounded"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Video Preview */}
      {showPreview && videoUrl && (
        <div className="mt-4 pt-4 border-t">
          <VideoPlayer
            src={videoUrl}
            title={item.title}
            height="200px"
            controls={!isLive}
            autoPlay={isLive}
          />
        </div>
      )}
    </div>
  );
};

// Hook for integrating with existing story system
export const useVideoIntegration = (db) => {
  const [mediaFiles, setMediaFiles] = useState(new Map());

  const attachVideoToStory = async (storyId, videoUrl, mediaId) => {
    try {
      // Update story in Firebase
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      await updateDoc(doc(db, "stories", storyId), {
        videoUrl,
        mediaId,
        hasVideo: true
      });

      setMediaFiles(prev => new Map(prev.set(storyId, { videoUrl, mediaId })));
    } catch (error) {
      console.error('Error attaching video to story:', error);
      throw error;
    }
  };

  const detachVideoFromStory = async (storyId) => {
    try {
      // Update story in Firebase
      const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      await updateDoc(doc(db, "stories", storyId), {
        videoUrl: null,
        mediaId: null,
        hasVideo: false
      });

      setMediaFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(storyId);
        return newMap;
      });
    } catch (error) {
      console.error('Error detaching video from story:', error);
      throw error;
    }
  };

  const getVideoForStory = (storyId) => {
    return mediaFiles.get(storyId);
  };

  return {
    attachVideoToStory,
    detachVideoFromStory,
    getVideoForStory,
    mediaFiles
  };
};

export { StoryWithVideo, RundownItemWithVideo };
