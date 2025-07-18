import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import {
  FileText, Calendar, Users, Settings, Plus, Edit3, Trash2, Clock, Globe, Tv,
  Radio, Send, Search, Filter, Bell, User, Save, Eye, LogIn, LogOut,
  PlayCircle, Pause, SkipForward, MessageSquare, AlertCircle, CheckCircle, XCircle,
  ArrowUp, ArrowDown, Sun, Moon, Shield, UserPlus, ListPlus, Check, Share2, CornerDownLeft, Lock, Unlock, Archive, ArchiveRestore, Printer, FilePlus, MoreVertical
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StoryWithVideo, RundownItemWithVideo, useVideoIntegration } from './media/StoryVideoIntegration';
import { generateMediaId } from './media/MediaManager';

// --- INITIAL DATA (Used only for seeding the database) ---

const initialUsers = [
  { id: 1, name: "Nik", email: "n.ik@example.com", groupId: 1, role: 'Admin' },
  { id: 2, name: "Alice Brown", email: "a.brown@example.com", groupId: 2, role: 'Journalist' },
  { id: 3, name: "Bob Wilson", email: "b.wilson@example.com", groupId: 2, role: 'Journalist' },
  { id: 4, name: "Cathy Jones", email: "c.jones@example.com", groupId: 1, role: 'Producer' },
  { id: 5, name: "David Miller", email: "d.miller@example.com", groupId: 3, role: 'Presenter' },
  { id: 6, name: "Eva Garcia", email: "e.garcia@example.com", groupId: 5, role: 'Editor' },
];

const initialGroups = [
  { id: 1, name: "Producers" },
  { id: 2, name: "Journalists" },
  { id: 3, name: "Presenters" },
  { id: 4, name: "Engineers" },
  { id: 5, name: "Editors" },
];

const initialStories = [
  { id: 1, title: "Breaking: Local Election Results", authorId: 2, status: "published", platform: "broadcast", created: "2025-07-15T10:00:00Z", scheduled: "2025-07-15T18:00:00Z", content: "Election results are coming in fast from across the county. Our reporters are live at key polling stations to bring you the latest updates as they happen. We'll have analysis and reactions from the candidates shortly.", tags: ["election", "breaking", "politics"], duration: "02:30", comments: [] },
  { id: 2, title: "Weather Update: Storm Warning", authorId: 3, status: "draft", platform: "web", created: "2025-07-15T09:30:00Z", scheduled: "2025-07-15T16:00:00Z", content: "A severe storm warning has been issued for the tri-state area, effective from 4 PM this afternoon. Meteorologists are predicting high winds, heavy rainfall, and potential flash flooding. Residents are advised to take necessary precautions.", tags: ["weather", "warning", "storm"], duration: "01:45", comments: [] },
  { id: 3, title: "City Council Meeting Coverage", authorId: 4, status: "draft", platform: "broadcast", created: "2025-07-15T11:00:00Z", scheduled: null, content: "The city council is set to vote on the new zoning laws today. The controversial proposal has drawn both strong support and fierce opposition from community groups. The meeting is expected to be contentious.", tags: ["politics", "local"], duration: "03:15", comments: [] },
];

const initialAssignments = [
  { id: 1, title: "City Council Meeting Coverage", assigneeId: 2, deadline: "2025-07-15T14:00:00Z", status: "in-progress", priority: "high", location: "City Hall", details: "Cover the vote on the new zoning proposal. Get interviews with council members and community leaders.", storyId: 3 },
  { id: 2, title: "Follow-up on Election Results", assigneeId: 3, deadline: "2025-07-16T10:00:00Z", status: "assigned", priority: "medium", location: "N/A", details: "Get reactions from the winning and losing candidates. Focus on the impact on local policy.", storyId: null },
];

const initialRundowns = [
  {
    id: 1, name: "6 PM Newscast", archived: false, items: [
      { id: 1, time: "18:00:00", title: "Opening Headlines", duration: "00:30", type: ['LV', 'STD'], content: "Good evening, and welcome to the 6 PM Newscast. Tonight, we're tracking the final results of the local election, a severe storm warning is in effect for our area, and the city council makes a decision on a major new development. All that and more, coming up.", storyId: null, storyStatus: null },
      { id: 2, time: "18:00:30", title: "Breaking: Local Election Results", duration: "02:30", type: ['PKG'], content: initialStories.find(s => s.id === 1)?.content || "", storyId: 1, storyStatus: 'Ready for Air' },
      { id: 3, time: "18:03:00", title: "Commercial Break", duration: "02:00", type: ['BRK'], content: "--- COMMERCIAL BREAK ---", storyId: null, storyStatus: null },
    ]
  },
  { id: 2, name: "11 PM Newscast", archived: false, items: [] },
  { id: 3, name: "Morning Show", archived: true, items: [] }
];

const initialRundownTemplates = [
  {
    id: 1, name: "Standard 30-Min Newscast", items: [
      { id: 1001, title: "A-Block: Top Stories", duration: "12:00", type: ['PKG', 'VO', 'LV'], content: "" },
      { id: 1002, title: "Commercial Break 1", duration: "02:00", type: ['BRK'], content: "" },
      { id: 1003, title: "B-Block: Weather & Features", duration: "08:00", type: ['PKG', 'VO'], content: "" },
      { id: 1004, title: "Commercial Break 2", duration: "02:00", type: ['BRK'], content: "" },
      { id: 1005, title: "C-Block: Sports & Kicker", duration: "05:00", type: ['VO', 'SOT'], content: "" },
      { id: 1006, title: "Goodnight", duration: "00:30", type: ['STD'], content: "" },
    ]
  }
];

// --- CONSTANTS & HELPERS ---

const PERMISSIONS = {
  Admin: { canManageUsers: true, canChangeAnyStatus: true, canDeleteAnything: true, canMoveRundownItems: true, canManageTemplates: true },
  Producer: { canManageUsers: false, canChangeAnyStatus: true, canDeleteAnything: true, canMoveRundownItems: true, canManageTemplates: false },
  Editor: { canManageUsers: false, canChangeAnyStatus: true, canDeleteAnything: false, canMoveRundownItems: false, canManageTemplates: false },
  Journalist: { canManageUsers: false, canChangeAnyStatus: false, canDeleteAnything: false, canMoveRundownItems: false, canManageTemplates: false },
  Presenter: { canManageUsers: false, canChangeAnyStatus: false, canDeleteAnything: false, canMoveRundownItems: false, canManageTemplates: false },
};
const RUNDOWN_STORY_STATUSES = ['Not Ready', 'In Progress', 'Done', 'Ready for Air'];
const RUNDOWN_ITEM_TYPES = { PKG: 'Package', VO: 'Voiceover', SOT: 'Sound on Tape', VID: 'Interview', LV: 'Live', STD: 'Studio', CG: 'Graphic', BRK: 'Break' };
const parseDuration = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
};
const formatDuration = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
const nameToUsername = (name) => {
  if (!name) return '';
  const parts = name.toLowerCase().split(' ');
  if (parts.length < 2) return parts[0];
  return `${parts[0].charAt(0)}.${parts[parts.length - 1]}`;
}

// --- AUTHENTICATION CONTEXT ---
const AuthContext = createContext();

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABPQCCJYON6b1MBJsnCGHFjLjLCK3WBOo",
  authDomain: "murrow-82a95.firebaseapp.com",
  databaseURL: "https://murrow-82a95-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "murrow-82a95",
  storageBucket: "murrow-82a95.firebasestorage.app",
  messagingSenderId: "177504964658",
  appId: "1:177504964658:web:1ed07d9588c1675fabec2b",
  measurementId: "G-DY9MGNYTJC"
};

// *** FIX: REMOVED DUPLICATE FIREBASE INITIALIZATION FROM HERE ***
// The initialization is now handled *only* inside the AuthProvider.

const AuthProvider = ({ children }) => {
  const [authServices, setAuthServices] = useState({
    currentUser: null,
    login: null,
    register: null,
    logout: null,
    db: null,
    loading: true,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js");
        const { getFirestore, doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

        // *** FIX: This is now the ONLY place Firebase is initialized. ***
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            setAuthServices(prev => ({ ...prev, currentUser: userDoc.exists() ? { uid: user.uid, ...userDoc.data() } : null, loading: false }));
          } else {
            setAuthServices(prev => ({ ...prev, currentUser: null, loading: false }));
          }
        });

        const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
        const register = async (email, password, name, role) => {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = {
            name, email, role,
            username: nameToUsername(name),
            groupId: initialGroups.find(g => g.name.toLowerCase().includes(role.toLowerCase()))?.id || null
          };
          await setDoc(doc(db, "users", userCredential.user.uid), newUser);
          return userCredential;
        };
        const logout = () => signOut(auth);

        setAuthServices(prev => ({
          ...prev,
          login,
          register,
          logout,
          db,
        }));

      } catch (error) {
        console.error("Firebase initialization failed", error);
        setAuthServices(prev => ({ ...prev, loading: false, db: null }));
      }
    };

    initialize();
  }, []);

  return (
    <AuthContext.Provider value={authServices}>
      {authServices.loading ? <div className="min-h-screen flex items-center justify-center">Loading...</div> : children}
    </AuthContext.Provider>
  );
};


const useAuth = () => {
  return useContext(AuthContext);
}

// --- MAIN APP WRAPPER ---
const AppWrapper = () => (
  <AuthProvider>
    <GlobalStyles />
    <App />
  </AuthProvider>
);

const App = () => {
  const { currentUser } = useAuth();
  return currentUser ? <MurrowNRCS /> : <AuthPage />;
}

// --- AUTHENTICATION PAGE ---
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { email, password, name, role } = e.target.elements;

    try {
      if (isLogin) {
        await login(email.value, password.value);
      } else {
        await register(email.value, password.value, name.value, role.value);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center"><Tv className="w-7 h-7 text-white" /></div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Murrow NRCS</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-2">{isLogin ? 'Log In' : 'Register'}</h2>
          <p className="text-center text-gray-500 mb-6">
            {isLogin ? "Welcome back!" : "Create your account to get started."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <InputField label="Full Name" name="name" type="text" required />
                <SelectField label="Profession" name="role" required options={Object.keys(PERMISSIONS).map(p => ({ value: p, label: p }))} />
              </>
            )}
            <InputField label="Email Address" name="email" type="email" required />
            <InputField label="Password" name="password" type="password" required />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full btn-primary" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline">
              {isLogin ? "Don't have an account? Register" : "Already have an account? Log In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const MurrowNRCS = () => {
  // --- STATE MANAGEMENT ---
  const { currentUser, logout, db } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stories, setStories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [rundowns, setRundowns] = useState([]);
  const [rundownTemplates, setRundownTemplates] = useState([]);

  const [activeRundownId, setActiveRundownId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);

  const [activeTab, setActiveTab] = useState('stories');
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState('light');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [presenterPrintView, setPresenterPrintView] = useState(null);

  const [isLive, setIsLive] = useState(false);
  const [liveTime, setLiveTime] = useState(0);
  const [currentLiveItemIndex, setCurrentLiveItemIndex] = useState(0);
  const [liveRundownId, setLiveRundownId] = useState(null);
  const liveIntervalRef = useRef(null);

  // ADD VIDEO INTEGRATION HOOK
  const { attachVideoToStory, detachVideoFromStory } = useVideoIntegration(db);

  // --- DATA FETCHING FROM FIRESTORE ---
  useEffect(() => {
    if (!db) return;

    // Dynamic import for firestore functions
    const setupListeners = async () => {
      const { collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
      const unsubscribers = [
        onSnapshot(collection(db, "users"), (snapshot) => setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "groups"), (snapshot) => setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "stories"), (snapshot) => setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "assignments"), (snapshot) => setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "rundowns"), (snapshot) => setRundowns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "rundownTemplates"), (snapshot) => setRundownTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))),
        onSnapshot(collection(db, "messages"), (snapshot) => setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)))),
      ];
      return () => unsubscribers.forEach(unsub => unsub());
    }

    const unsubscribePromise = setupListeners();
    return () => {
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [db]);

  const userPermissions = PERMISSIONS[currentUser.role];
  const activeRundown = rundowns.find(r => r.id === activeRundownId);

  const setActiveRundownItems = async (items) => {
    if (!db || !activeRundownId) return;
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    await updateDoc(doc(db, "rundowns", activeRundownId), { items });
  };

  const updateRundownItem = (itemId, updatedData) => {
    if (!activeRundown) return;
    const updatedItems = activeRundown.items.map(item =>
      item.id === itemId ? { ...item, ...updatedData } : item
    );
    setActiveRundownItems(updatedItems);
  };

  const calculateTotalDuration = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + parseDuration(item.duration), 0);
  };

  useEffect(() => {
    if (isLive && activeRundown) {
      const remainingItems = activeRundown.items.slice(currentLiveItemIndex);
      setLiveTime(calculateTotalDuration(remainingItems));
      liveIntervalRef.current = setInterval(() => {
        setLiveTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(liveIntervalRef.current);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      clearInterval(liveIntervalRef.current);
    }
    return () => clearInterval(liveIntervalRef.current);
  }, [isLive, currentLiveItemIndex, activeRundown]);

  const handleGoLive = () => {
    setIsLive(true);
    setCurrentLiveItemIndex(0);
    setLiveRundownId(activeRundownId);
    setActiveTab('live');
  };

  const handleEndLive = () => {
    setIsLive(false);
    setLiveRundownId(null);
    setActiveTab('rundown');
  };

  const handleNextLiveItem = () => {
    if (activeRundown && currentLiveItemIndex < activeRundown.items.length - 1) {
      setCurrentLiveItemIndex(prev => prev + 1);
    } else {
      handleEndLive();
    }
  };

  // MODIFIED handleSave TO INCLUDE MEDIA ID GENERATION
  const handleSave = async (item, type) => {
    if (!db) return;
    const { collection, doc, updateDoc, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    const collectionName = `${type}s`;

    // Add media ID for new stories
    if (type === 'story' && !item.id) {
      item.mediaId = generateMediaId(item.type?.[0] || 'PKG');
      item.hasVideo = false;
      item.videoUrl = null;
    }

    if (item.id) {
      const docRef = doc(db, collectionName, item.id);
      const { id, ...dataToUpdate } = item;
      await updateDoc(docRef, dataToUpdate);
    } else {
      await addDoc(collection(db, collectionName), item);
    }
    setModal(null);
  };

  const handleDelete = async (id, type) => {
    if (!db) return;
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    await deleteDoc(doc(db, `${type}s`, id));
    setModal(null);
  };

  const openDeleteConfirm = (id, type) => {
    setModal({ type: 'deleteConfirm', id, itemType: type });
  };

  const handleAddStoryToRundown = async (story, isNew, itemTypes) => {
    if (!db) return;
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    let storyToAdd = story;
    if (isNew) {
      const newStory = {
        ...story,
        authorId: currentUser.uid,
        status: 'draft',
        created: new Date().toISOString(),
        comments: [],
        mediaId: generateMediaId(itemTypes[0] || 'PKG'),
        hasVideo: false,
        videoUrl: null
      };
      const docRef = await addDoc(collection(db, "stories"), newStory);
      storyToAdd = { ...newStory, id: docRef.id };
    }
    const newRundownItem = {
      id: Date.now(), time: "00:00:00", title: storyToAdd.title,
      duration: storyToAdd.duration || "01:00", type: itemTypes,
      content: storyToAdd.content, storyId: storyToAdd.id, storyStatus: 'Not Ready',
    };
    const updatedItems = [...(activeRundown?.items || []), newRundownItem];
    setActiveRundownItems(updatedItems);
    setModal(null);
  };

  const updateRundownStoryStatus = (rundownItemId, newStatus) => {
    if (!activeRundown) return;
    const updatedItems = activeRundown.items.map(item =>
      item.id === rundownItemId ? { ...item, storyStatus: newStatus } : item
    );
    setActiveRundownItems(updatedItems);
  };

  const handleArchiveRundown = async (rundownId) => {
    if (!db) return;
    const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    const rundownRef = doc(db, "rundowns", rundownId);
    const currentRundown = rundowns.find(r => r.id === rundownId);
    await updateDoc(rundownRef, { archived: !currentRundown.archived });

    if (rundownId === activeRundownId) {
      const nextActiveRundown = rundowns.find(r => r.id !== rundownId && !r.archived);
      if (nextActiveRundown) {
        setActiveRundownId(nextActiveRundown.id);
      }
    }
  };

  const getUserById = (id) => users.find(u => u.id === id);
  const getGroupById = (id) => groups.find(g => g.id === id);

  const addNotification = (userId, message) => {
    const newNotification = { id: Date.now(), userId, message, read: false, date: new Date().toISOString() };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleSendMessage = async (text) => {
    if (!db) return;
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    const newMessage = {
      userId: currentUser.uid,
      userName: currentUser.name,
      text: text,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, "messages"), newMessage);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': case 'Ready for Air': case 'Done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'approved': case 'in-progress': case 'In Progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'draft': case 'Not Ready': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'assigned': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRundownTypeColor = (type) => {
    switch (type) {
      case 'LV': case 'STD': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'BRK': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'PKG': case 'VO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'VID': case 'SOT': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
      case 'CG': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'broadcast': return <Tv className="w-4 h-4" />;
      case 'web': return <Globe className="w-4 h-4" />;
      case 'social': return <MessageSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredStories = stories.filter(story =>
    story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (story.content && story.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (story.tags && story.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const isRundownLocked = isLive && liveRundownId === activeRundownId;

  if (presenterPrintView) {
    return <PresenterPrintView rundown={presenterPrintView} close={() => setPresenterPrintView(null)} />
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors ${theme}`}>
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Tv className="w-5 h-5 text-white" /></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Murrow</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm hidden sm:inline">Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400 cursor-pointer" />
                <button onClick={logout} className="btn-secondary !px-3"><LogOut className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </header>

        <nav className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'stories', label: 'Stories', icon: FileText, permission: true },
                { id: 'rundown', label: 'Rundown', icon: PlayCircle, permission: true },
                { id: 'assignments', label: 'Assignments', icon: Calendar, permission: true },
                { id: 'admin', label: 'Admin', icon: Shield, permission: userPermissions.canManageUsers },
                { id: 'live', label: 'Live Mode', icon: Radio, permission: isLive },
              ].map(tab => (tab.permission &&
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                ><tab.icon className="w-4 h-4" /><span>{tab.label}</span></button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* MODIFIED STORIES TAB TO USE VIDEO-ENABLED COMPONENTS */}
          {activeTab === 'stories' && <StoriesTab stories={filteredStories} assignments={assignments} onSave={(story) => handleSave(story, 'story')} onDelete={(id) => openDeleteConfirm(id, 'story')} getUserById={getUserById} getStatusColor={getStatusColor} getPlatformIcon={getPlatformIcon} userPermissions={userPermissions} currentUser={currentUser} searchTerm={searchTerm} setSearchTerm={setSearchTerm} users={users} db={db} />}

          {/* MODIFIED RUNDOWN TAB TO USE VIDEO-ENABLED COMPONENTS */}
          {activeTab === 'rundown' && <RundownTab rundown={activeRundown?.items || []} setRundown={setActiveRundownItems} stories={stories} onAddStory={() => setModal({ type: 'addStoryToRundown' })} updateRundownStoryStatus={updateRundownStoryStatus} getStatusColor={getStatusColor} getRundownTypeColor={getRundownTypeColor} userPermissions={userPermissions} onEditStory={(story) => handleSave(story, 'story')} calculateTotalDuration={calculateTotalDuration} onGoLive={handleGoLive} rundowns={rundowns} activeRundownId={activeRundownId} setActiveRundownId={setActiveRundownId} onNewRundown={() => setModal({ type: 'rundownEditor' })} onArchiveRundown={handleArchiveRundown} showArchived={showArchived} setShowArchived={setShowArchived} isLocked={isRundownLocked} onPrintForPresenter={() => setPresenterPrintView(activeRundown)} updateRundownItem={updateRundownItem} db={db} isLive={isLive} currentLiveItemIndex={currentLiveItemIndex} />}

          {activeTab === 'assignments' && <AssignmentsTab assignments={assignments} users={users} onSave={(item) => handleSave(item, 'assignment')} onDelete={(id) => openDeleteConfirm(id, 'assignment')} getUserById={getUserById} getStatusColor={getStatusColor} userPermissions={userPermissions} />}
          {activeTab === 'admin' && <AdminTab users={users} groups={groups} onSave={handleSave} onDelete={openDeleteConfirm} getGroupById={getGroupById} rundownTemplates={rundownTemplates} userPermissions={userPermissions} />}

          {/* MODIFIED LIVE MODE TAB TO INCLUDE VIDEO SUPPORT */}
          {activeTab === 'live' && activeRundown && <LiveModeTab rundown={activeRundown.items} liveTime={liveTime} currentLiveItemIndex={currentLiveItemIndex} onNext={handleNextLiveItem} onEnd={handleEndLive} getRundownTypeColor={getRundownTypeColor} getStatusColor={getStatusColor} stories={stories} db={db} />}
        </main>

        <Chatbox messages={messages} onSendMessage={handleSendMessage} currentUser={currentUser} getUserById={getUserById} />

        {modal?.type === 'rundownEditor' && <RundownEditor onSave={(rundown) => handleSave(rundown, 'rundown')} onCancel={() => setModal(null)} templates={rundownTemplates} />}
        {modal?.type === 'addStoryToRundown' && <AddStoryToRundownModal onSave={handleAddStoryToRundown} onCancel={() => setModal(null)} stories={stories} />}
        {modal?.type === 'deleteConfirm' && <ConfirmationDialog onConfirm={() => handleDelete(modal.id, modal.itemType)} onCancel={() => setModal(null)} title="Confirm Deletion" message="Are you sure you want to delete this item? This action cannot be undone." />}
      </div>
    </DndProvider>
  );
};

const Chatbox = ({ messages, onSendMessage, currentUser, getUserById }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  useEffect(scrollToBottom, [messages]);
  const handleSubmit = (e) => { e.preventDefault(); if (newMessage.trim()) { onSendMessage(newMessage.trim()); setNewMessage(""); } };
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-300 dark:border-gray-600">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">Team Chat</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XCircle className="w-6 h-6 text-gray-500" /></button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map(msg => {
              const user = getUserById(msg.userId);
              const isCurrentUser = msg.userId === currentUser.uid;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                  {!isCurrentUser && <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold text-sm shrink-0">{msg.userName?.charAt(0)}</div>}
                  <div className={`max-w-[75%] p-3 rounded-lg ${isCurrentUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {!isCurrentUser && <div className="font-bold text-sm mb-1">{msg.userName}</div>}
                    <p className="text-sm">{msg.text}</p>
                    <div className={`text-xs mt-1 opacity-70 ${isCurrentUser ? 'text-blue-200' : ''}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 form-input"
            />
            <button type="submit" className="btn-primary !px-3"><Send className="w-5 h-5" /></button>
          </form>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700">
          <MessageSquare className="w-8 h-8" />
        </button>
      )}
    </div>
  );
};

// MODIFIED STORIES TAB TO USE VIDEO COMPONENTS
const StoriesTab = ({ stories, assignments, onSave, onDelete, getUserById, getStatusColor, getPlatformIcon, userPermissions, currentUser, searchTerm, setSearchTerm, users, db }) => {
  const [view, setView] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const myAuthoredStories = stories.filter(story => story.authorId === currentUser.uid);
  const myAssignedTasks = assignments.filter(assignment => assignment.assigneeId === currentUser.uid);

  const handleShare = (story) => {
    const shareText = `Check out this story: "${story.title}"\n(Link: /stories/${story.id})`;
    const textArea = document.createElement("textarea");
    textArea.value = shareText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('Story info copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  const handleSaveStory = (story) => {
    onSave(story);
    setEditingId(null);
    setIsCreating(false);
  }

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
  }

  const renderStoryCard = (story) => {
    const isEditing = editingId === story.id;
    const canEdit = userPermissions.canChangeAnyStatus || story.authorId === currentUser.uid;

    if (isEditing) {
      return <InlineStoryEditor key={story.id} story={story} onSave={handleSaveStory} onCancel={handleCancel} users={users} />
    }

    // MAIN CHANGE: Use video-enabled story component
    return (
      <StoryWithVideo
        key={story.id}
        story={story}
        onStoryUpdate={onSave}
        onVideoAttached={(storyId, videoUrl, mediaId) => {
          console.log(`Video attached to story ${storyId}: ${mediaId}`);
          // Optional: Add toast notification here
        }}
        onVideoDetached={(storyId, mediaId) => {
          console.log(`Video detached from story ${storyId}`);
        }}
        db={db}
        expanded={false}
        showVideoControls={canEdit}
      />
    );
  };

  const renderAssignmentCard = (assignment) => (
    <div key={`assign-${assignment.id}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
      <div className="flex items-center flex-wrap gap-x-3 mb-2">
        <Calendar className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-medium">{assignment.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>{assignment.status}</span>
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">{assignment.details}</p>
      <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
        <span>Deadline: {new Date(assignment.deadline).toLocaleString()}</span>
        {assignment.storyId && <span className="text-blue-500">Linked to story ID: {assignment.storyId}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Stories</h2>
          <div className="flex rounded-md shadow-sm bg-gray-200 dark:bg-gray-700 p-1">
            <button onClick={() => setView('all')} className={`px-3 py-1 text-sm rounded-md ${view === 'all' ? 'bg-white dark:bg-gray-900 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
              All Stories
            </button>
            <button onClick={() => setView('mine')} className={`px-3 py-1 text-sm rounded-md ${view === 'mine' ? 'bg-white dark:bg-gray-900 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
              My Stories
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
          </div>
          <button onClick={() => setIsCreating(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>New Story</span>
          </button>
        </div>
      </div>
      {isCreating && <InlineStoryEditor story={null} onSave={handleSaveStory} onCancel={handleCancel} users={users} authorId={currentUser.uid} />}
      {view === 'all' ? (
        <div className="grid gap-4">{stories.map(renderStoryCard)}</div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-3">My Authored Stories ({myAuthoredStories.length})</h3>
          {myAuthoredStories.length > 0 ? (
            <div className="grid gap-4 mb-8">{myAuthoredStories.map(renderStoryCard)}</div>
          ) : (
            <p className="text-gray-500">You have not authored any stories.</p>
          )}
          <h3 className="text-lg font-semibold mb-3">My Assignments ({myAssignedTasks.length})</h3>
          {myAssignedTasks.length > 0 ? (
            <div className="grid gap-4">{myAssignedTasks.map(renderAssignmentCard)}</div>
          ) : (
            <p className="text-gray-500">You have no pending assignments.</p>
          )}
        </div>
      )}
    </div>
  );
};

const RundownDraggableItem = ({ item, index, rundown, moveItem, updateRundownStoryStatus, getStatusColor, getRundownTypeColor, onEdit, canDrag, isLocked, isEditing, onToggleEdit, onSave, onCancel }) => {
  const ref = useRef(null);
  const [{ handlerId }, drop] = useDrop({
    accept: 'rundownItem',
    collect(monitor) {
      return { handlerId: monitor.getHandlerId() };
    },
    hover(draggedItem, monitor) {
      if (!ref.current || isLocked || isEditing) return;
      const dragIndex = draggedItem.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      moveItem(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'rundownItem',
    item: () => ({ id: item.id, index }),
    canDrag: canDrag && !isLocked && !isEditing,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  if (canDrag && !isLocked) {
    drag(drop(ref));
  } else {
    drop(ref);
  }

  const [formData, setFormData] = useState(item);

  useEffect(() => {
    setFormData(item);
  }, [item, isEditing]);

  const handleSave = (e) => {
    e.stopPropagation();
    onSave(item.id, formData);
  }

  const handleCancel = (e) => {
    e.stopPropagation();
    onCancel();
  }

  if (isEditing) {
    return (
      <div ref={ref} className="p-4 bg-blue-50 dark:bg-gray-700/50 border-l-4 border-blue-500">
        <div className="space-y-4">
          <InputField label="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          <InputField label="Duration" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} placeholder="MM:SS" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type(s)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(RUNDOWN_ITEM_TYPES).map(abbr => (
                <label key={abbr} className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer has-[:checked]:bg-blue-100 dark:has-[:checked]:bg-blue-900/50">
                  <input type="checkbox"
                    checked={formData.type.includes(abbr)}
                    onChange={() => {
                      const newTypes = formData.type.includes(abbr)
                        ? formData.type.filter(t => t !== abbr)
                        : [...formData.type, abbr];
                      setFormData({ ...formData, type: newTypes });
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{abbr}</span>
                </label>
              ))}
            </div>
          </div>
          <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} rows={5} className="w-full form-input" placeholder="Script or content..." />
          <div className="flex justify-end space-x-2">
            <button onClick={handleCancel} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`p-4 group relative ${isDragging ? 'opacity-50' : 'opacity-100'} ${isLocked ? 'opacity-75' : ''} border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex flex-col items-center space-y-1">
            <button
              onClick={(e) => { e.stopPropagation(); if (!isLocked) moveItem(index, index - 1); }}
              disabled={index === 0 || isLocked}
              className="p-1 disabled:opacity-20"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gray-100 dark:bg-gray-600">
              {index + 1}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); if (!isLocked) moveItem(index, index + 1); }}
              disabled={index >= rundown.length - 1 || isLocked}
              className="p-1 disabled:opacity-20"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium">{item.title}</h4>
              <div className="flex items-center gap-1 flex-wrap">
                {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                  <span key={t} className={`px-2 py-1 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>{t}</span>
                ))}
              </div>
              {isLocked && <Lock className="w-4 h-4 text-red-500" />}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>Duration: {item.duration}</span>
              {item.storyId && (
                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                  <span>Status:</span>
                  <select
                    value={item.storyStatus || 'Not Ready'}
                    onChange={(e) => updateRundownStoryStatus(item.id, e.target.value)}
                    disabled={isLocked}
                    className={`text-xs p-1 rounded border-none ${getStatusColor(item.storyStatus)} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {RUNDOWN_STORY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        {!isLocked && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button onClick={(e) => { e.stopPropagation(); onToggleEdit(item.id); }} className="p-2 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// MODIFIED RUNDOWN TAB TO USE VIDEO COMPONENTS
const RundownTab = ({ rundown, setRundown, stories, onAddStory, updateRundownStoryStatus, getStatusColor, getRundownTypeColor, userPermissions, onEditStory, calculateTotalDuration, onGoLive, rundowns, activeRundownId, setActiveRundownId, onNewRundown, onArchiveRundown, showArchived, setShowArchived, isLocked, onPrintForPresenter, updateRundownItem, db, isLive, currentLiveItemIndex }) => {
  const [editingId, setEditingId] = useState(null);

  const moveItem = useCallback((dragIndex, hoverIndex) => {
    if (isLocked) return;
    const newRundown = [...rundown];
    if (hoverIndex < 0 || hoverIndex >= newRundown.length) return;
    const [draggedItem] = newRundown.splice(dragIndex, 1);
    newRundown.splice(hoverIndex, 0, draggedItem);
    setRundown(newRundown);
  }, [rundown, setRundown, isLocked]);

  const handleSaveItem = (itemId, updatedData) => {
    updateRundownItem(itemId, updatedData);
    setEditingId(null);
  }

  const totalDuration = calculateTotalDuration(rundown);
  const availableRundowns = rundowns.filter(r => showArchived || !r.archived);
  const currentRundown = rundowns.find(r => r.id === activeRundownId);

  const handleRundownChange = (e) => {
    const value = e.target.value;
    if (value === '') return;
    setActiveRundownId(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Show Rundown</h2>
          <div className="flex items-center gap-2">
            <select
              value={activeRundownId || ''}
              onChange={handleRundownChange}
              disabled={isLocked}
              className={`bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">-- Select Rundown --</option>
              {availableRundowns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.archived ? '(Archived)' : ''}
                </option>
              ))}
            </select>
            {currentRundown && (
              <button
                onClick={() => onArchiveRundown(activeRundownId)}
                disabled={isLocked}
                className={`p-2 text-gray-500 hover:text-orange-600 rounded ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={currentRundown.archived ? "Restore Rundown" : "Archive Rundown"}
              >
                {currentRundown.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </button>
            )}
          </div>
          <button
            onClick={onNewRundown}
            disabled={isLocked}
            className={`btn-secondary text-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show Archived
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onPrintForPresenter} disabled={!currentRundown || rundown.length === 0} className="btn-secondary">
            <Printer className="w-4 h-4" />
            <span>Print for Presenter</span>
          </button>
          <div className="flex items-center gap-2 text-lg">
            <Clock className="w-6 h-6" />
            <span className="font-bold">{formatDuration(totalDuration)}</span>
          </div>
          <button
            onClick={onGoLive}
            disabled={!currentRundown || currentRundown.archived || rundown.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium text-sm rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-500 disabled:hover:to-red-600"
          >
            <Radio className="w-4 h-4" />
            <span>Go Live</span>
          </button>
        </div>
      </div>

      {currentRundown && !currentRundown.archived ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-4 border-b flex justify-end">
            <button
              onClick={() => onAddStory()}
              disabled={isLocked}
              className={`btn-primary ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ListPlus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {/* MAIN CHANGE: Use video-enabled rundown items */}
            {rundown.map((item, index) => {
              const story = item.storyId ? stories.find(s => s.id === item.storyId) : null;
              return (
                <RundownItemWithVideo
                  key={item.id}
                  item={item}
                  story={story}
                  onItemUpdate={updateRundownItem}
                  db={db}
                  isLive={isLive && currentLiveItemIndex === index}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          {!currentRundown ? 'Select a rundown to view items, or create a new one.' : 'This rundown is archived. Restore it to make changes.'}
        </div>
      )}
    </div>
  );
};

// MODIFIED LIVE MODE TAB TO INCLUDE VIDEO PREVIEW
const LiveModeTab = ({ rundown, liveTime, currentLiveItemIndex, onNext, onEnd, getRundownTypeColor, getStatusColor, stories, db }) => {
  const currentItem = rundown[currentLiveItemIndex];
  const currentStory = currentItem?.storyId ? stories.find(s => s.id === currentItem.storyId) : null;

  return (
    <div className="space-y-8">
      <div className="text-center p-8 bg-gray-800 text-white rounded-lg shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">LIVE MODE</h2>
        <div className="text-7xl font-mono tracking-widest">{formatDuration(liveTime)}</div>
        <p className="text-xl mt-2">Remaining Time</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-2">Now On Air:</h3>
        <div className="text-2xl font-bold text-blue-500">{currentItem?.title || "End of Show"}</div>
        <div className="flex items-center gap-2 mt-2">
          {(Array.isArray(currentItem?.type) ? currentItem.type : []).map(t => (
            <span key={t} className={`px-2 py-1 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>{t}</span>
          ))}
        </div>
      </div>

      {/* ADD VIDEO PREVIEW FOR CURRENT ITEM */}
      {currentStory?.videoUrl && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Current Video</h3>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center h-64">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <PlayCircle className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>Video Player Component</p>
              <p className="text-sm">Would show: {currentStory.title}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-2">Up Next:</h3>
            <p className="text-xl">{rundown[currentLiveItemIndex + 1]?.title || "End of Show"}</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button onClick={onNext} className="btn-primary text-lg px-8 py-4 w-full">
              Next Item <SkipForward className="w-5 h-5" />
            </button>
            <button onClick={onEnd} className="btn-secondary bg-red-600 text-white hover:bg-red-700 w-full text-lg px-8 py-4">
              End Live
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Full Rundown</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rundown.map((item, index) => (
              <div
                key={item.id}
                className={`p-3 border-b last:border-b-0 ${index === currentLiveItemIndex ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : index < currentLiveItemIndex ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${index === currentLiveItemIndex ? 'bg-red-500 text-white' : index < currentLiveItemIndex ? 'bg-gray-300 text-gray-600' : 'bg-gray-100 text-gray-800'}`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-gray-500">Duration: {item.duration}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {(Array.isArray(item.type) ? item.type : [item.type]).map(t => (
                      <span key={t} className={`px-1 py-0.5 rounded text-xs font-bold ${getRundownTypeColor(t)}`}>{t}</span>
                    ))}
                    {item.storyStatus && (
                      <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusColor(item.storyStatus)}`}>
                        {item.storyStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssignmentsTab = ({ assignments, users, onSave, onDelete, getUserById, getStatusColor, userPermissions }) => {
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (assignment) => {
    onSave(assignment);
    setEditingId(null);
    setIsCreating(false);
  }

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
  }

  const renderAssignment = (assignment) => {
    if (editingId === assignment.id) {
      return <InlineAssignmentEditor key={assignment.id} assignment={assignment} onSave={handleSave} onCancel={handleCancel} users={users} />
    }

    return (
      <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-medium">{assignment.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>{assignment.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500">
              <span>Assigned to: {getUserById(assignment.assigneeId)?.name || 'Unassigned'}</span>
              <span>Deadline: {new Date(assignment.deadline).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            {userPermissions.canChangeAnyStatus && (
              <button onClick={() => setEditingId(assignment.id)} className="p-2 text-gray-500 hover:text-blue-600 rounded">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {userPermissions.canDeleteAnything && (
              <button onClick={() => onDelete(assignment.id, 'assignment')} className="p-2 text-gray-500 hover:text-red-600 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Assignments</h2>
        <button onClick={() => setIsCreating(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>
      <div className="grid gap-4">
        {isCreating && <InlineAssignmentEditor assignment={null} onSave={handleSave} onCancel={handleCancel} users={users} />}
        {assignments.map(renderAssignment)}
      </div>
    </div>
  );
}

const AdminTab = ({ users, groups, onSave, onDelete, getGroupById, rundownTemplates, userPermissions }) => {
  const [editingTarget, setEditingTarget] = useState(null); // { type: 'user' | 'group' | 'template', id: number }
  const [isCreating, setIsCreating] = useState(null); // 'user' | 'group' | 'template'

  const handleSaveItem = (item, type) => {
    onSave(item, type);
    setEditingTarget(null);
    setIsCreating(null);
  };

  const handleCancel = () => {
    setEditingTarget(null);
    setIsCreating(null);
  };

  const renderUserRow = (user) => {
    if (editingTarget?.type === 'user' && editingTarget.id === user.id) {
      return <InlineUserEditor key={user.id} user={user} onSave={(item) => handleSaveItem(item, 'user')} onCancel={handleCancel} groups={groups} />
    }
    return (
      <div key={user.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
        <div>
          <span className="font-medium">{user.name}</span>
          <span className="text-sm text-gray-500 ml-2">({user.role} / {getGroupById(user.groupId)?.name || 'No Group'})</span>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => setEditingTarget({ type: 'user', id: user.id })} className="p-2 text-gray-500 hover:text-blue-600 rounded"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(user.id, 'user')} className="p-2 text-gray-500 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const renderGroupRow = (group) => {
    if (editingTarget?.type === 'group' && editingTarget.id === group.id) {
      return <InlineGroupEditor key={group.id} group={group} onSave={(item) => handleSaveItem(item, 'group')} onCancel={handleCancel} />
    }
    return (
      <div key={group.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
        <span className="font-medium">{group.name}</span>
        <div className="flex items-center space-x-1">
          <button onClick={() => setEditingTarget({ type: 'group', id: group.id })} className="p-2 text-gray-500 hover:text-blue-600 rounded"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(group.id, 'group')} className="p-2 text-gray-500 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const renderTemplateRow = (template) => {
    if (editingTarget?.type === 'template' && editingTarget.id === template.id) {
      return <RundownTemplateEditor key={template.id} template={template} onSave={(item) => handleSaveItem(item, 'rundownTemplate')} onCancel={handleCancel} />
    }
    return (
      <div key={template.id} className="flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded">
        <span className="font-medium">{template.name}</span>
        <div className="flex items-center space-x-1">
          <button onClick={() => setEditingTarget({ type: 'template', id: template.id })} className="p-2 text-gray-500 hover:text-blue-600 rounded"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(template.id, 'rundownTemplate')} className="p-2 text-gray-500 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Users</h2>
          <button onClick={() => setIsCreating('user')} className="btn-primary text-sm"><UserPlus className="w-4 h-4" /><span>Add User</span></button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
          {isCreating === 'user' && <InlineUserEditor user={null} onSave={(item) => handleSaveItem(item, 'user')} onCancel={handleCancel} groups={groups} />}
          {users.map(renderUserRow)}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Groups</h2>
          <button onClick={() => setIsCreating('group')} className="btn-primary text-sm"><Plus className="w-4 h-4" /><span>Add Group</span></button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
          {isCreating === 'group' && <InlineGroupEditor group={null} onSave={(item) => handleSaveItem(item, 'group')} onCancel={handleCancel} />}
          {groups.map(renderGroupRow)}
        </div>
      </div>
      {userPermissions.canManageTemplates && (
        <div className="space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Rundown Templates</h2>
            <button onClick={() => setIsCreating('template')} className="btn-primary text-sm"><FilePlus className="w-4 h-4" /><span>New Template</span></button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 space-y-2">
            {isCreating === 'template' && <RundownTemplateEditor template={null} onSave={(item) => handleSaveItem(item, 'rundownTemplate')} onCancel={handleCancel} />}
            {rundownTemplates.map(renderTemplateRow)}
          </div>
        </div>
      )}
    </div>
  );
};

// Add this line right before the 'InlineStoryEditor' function in your App.jsx
const VIDEO_ITEM_TYPES = ['PKG', 'VO', 'SOT', 'VID'];

const InlineStoryEditor = ({ story, onSave, onCancel, users, authorId }) => {
  const [formData, setFormData] = useState({
    title: story?.title || '',
    content: story?.content || '',
    authorId: story?.authorId || authorId || '',
    platform: story?.platform || 'broadcast',
    tags: story?.tags?.join(', ') || '',
    duration: story?.duration || '',
    status: story?.status || 'draft',
    // Include video fields for local state management
    videoId: story?.videoId,
    videoStatus: story?.videoStatus,
    videoUrl: story?.videoUrl
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...story,
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim())
    });
  };

  const handleLocalUpdate = (updatedStory) => {
    setFormData(prev => ({ ...prev, ...updatedStory }));
  }

  const handleTypeClick = (type) => {
    const typeTag = `[${type}]`;
    // Toggles the video type tag in the title
    const newTitle = formData.title.toUpperCase().includes(typeTag)
      ? formData.title.replace(new RegExp(`\\s*\\[${type}\\]`, 'ig'), '')
      : `${formData.title} ${typeTag}`;

    setFormData(prev => ({ ...prev, title: newTitle.trim() }));
  };

  const hasVideo = VIDEO_ITEM_TYPES.some(t => formData.title.toUpperCase().includes(t));

  return (
    <div className="bg-blue-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500 p-6 my-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">{story ? 'Edit Story' : 'Create New Story'}</h3>
        <InputField label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
        
        {/* NEW: Buttons to add/remove video component tags to the title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Video Component</label>
          <div className="flex flex-wrap gap-2">
              {VIDEO_ITEM_TYPES.map(type => (
                  <button
                      type="button"
                      key={type}
                      onClick={() => handleTypeClick(type)}
                      className={`btn-secondary !px-3 !py-1 text-xs transition-colors ${formData.title.toUpperCase().includes(`[${type}]`) ? 'bg-blue-200 dark:bg-blue-800 border-blue-400' : ''}`}
                  >
                      {RUNDOWN_ITEM_TYPES[type] || type}
                  </button>
              ))}
          </div>
        </div>

        <SelectField label="Author" value={formData.authorId} onChange={e => setFormData({ ...formData, authorId: e.target.value })} options={users.map(u => ({ value: u.id, label: u.name }))} />
        <SelectField label="Status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} options={['draft', 'approved', 'published'].map(s => ({ value: s, label: s }))} />
        <InputField label="Duration" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="MM:SS" />
        <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={8} className="w-full form-input" placeholder="Enter story content..." required />

        {/* This now correctly detects video keywords and shows the VideoManager during story creation. */}
        {hasVideo && <VideoManager story={formData} onUpdate={handleLocalUpdate} />}

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary"><Save className="w-4 h-4" /><span>Save</span></button>
        </div>
      </form>
    </div>
  );
};

const InlineAssignmentEditor = ({ assignment, onSave, onCancel, users }) => {
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    assigneeId: assignment?.assigneeId || '',
    deadline: assignment?.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
    details: assignment?.details || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...assignment,
      ...formData,
      deadline: new Date(formData.deadline).toISOString()
    });
  };

  return (
    <div className="bg-purple-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-purple-500 p-6 my-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">{assignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
        <InputField label="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
        <SelectField label="Assign To" value={formData.assigneeId} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })} options={users.map(u => ({ value: u.id, label: u.name }))} />
        <InputField label="Deadline" type="datetime-local" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} required />
        <textarea value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} rows={4} className="w-full form-input" placeholder="Assignment details..." />
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary"><Save className="w-4 h-4" /><span>Save</span></button>
        </div>
      </form>
    </div>
  );
};

const InlineUserEditor = ({ user, onSave, onCancel, groups }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    groupId: user?.groupId || '',
    role: user?.role || 'Journalist'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 my-2 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
        <SelectField label="Group" value={formData.groupId} onChange={e => setFormData({ ...formData, groupId: e.target.value })} options={groups.map(g => ({ value: g.id, label: g.name }))} />
        <SelectField label="Role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} options={Object.keys(PERMISSIONS).map(p => ({ value: p, label: p }))} />
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
};

const InlineGroupEditor = ({ group, onSave, onCancel }) => {
  const [name, setName] = useState(group?.name || '');
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...group, name });
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 my-2 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Group Name" value={name} onChange={e => setName(e.target.value)} required />
        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
};

const RundownEditor = ({ onSave, onCancel, templates }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, templateId: templateId || null });
  };

  return (
    <ModalBase onCancel={onCancel} title="Create New Rundown">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <InputField
          label="Rundown Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <SelectField
          label="Template (Optional)"
          value={templateId}
          onChange={e => setTemplateId(e.target.value)}
          options={templates.map(t => ({ value: t.id, label: t.name }))}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" />
            <span>Create</span>
          </button>
        </div>
      </form>
    </ModalBase>
  );
};

const RundownTemplateEditor = ({ template, onSave, onCancel }) => {
  const [name, setName] = useState(template?.name || '');
  const [items, setItems] = useState(template?.items || []);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), title: 'New Item', duration: '01:00', type: ['PKG'], content: '' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...template, name, items });
  };

  return (
    <div className="bg-blue-50 dark:bg-gray-800/50 rounded-lg border-l-4 border-blue-500 p-6 my-4 col-span-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h3 className="text-lg font-semibold">{template ? 'Edit Template' : 'Create New Template'}</h3>
        <InputField
          label="Template Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <div>
          <h3 className="text-md font-medium mb-2">Template Items</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto p-2 border rounded-md bg-white dark:bg-gray-800">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                 <div className="col-span-5">
                    <input type="text" value={item.title} onChange={e => handleItemChange(index, 'title', e.target.value)} className="form-input w-full" placeholder="Item Title" />
                 </div>
                 <div className="col-span-2">
                    <input type="text" value={item.duration} onChange={e => handleItemChange(index, 'duration', e.target.value)} className="form-input w-full" placeholder="MM:SS" />
                 </div>
                 <div className="col-span-4">
                     <select value={item.type[0]} onChange={e => handleItemChange(index, 'type', [e.target.value])} className="form-input w-full">
                         {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
                     </select>
                 </div>
                 <div className="col-span-1">
                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                 </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="btn-secondary mt-3 text-sm">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" />
            <span>Save Template</span>
          </button>
        </div>
      </form>
    </div>
  );
};

const AddStoryToRundownModal = ({ onSave, onCancel, stories }) => {
  const [tab, setTab] = useState('existing');
  const [selectedStoryId, setSelectedStoryId] = useState(stories[0]?.id || '');
  const [selectedTypes, setSelectedTypes] = useState(['PKG']);
  const [newStoryData, setNewStoryData] = useState({ title: '', content: '', duration: '01:00' });

  const handleTypeChange = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleSave = () => {
    if (selectedTypes.length === 0) {
      console.log("Please select at least one item type.");
      return;
    }
    if (tab === 'existing') {
      const story = stories.find(s => s.id === selectedStoryId);
      if (story) {
        onSave(story, false, selectedTypes);
      }
    } else {
      const dataToSave = { ...newStoryData };
      if (!dataToSave.title.trim() && selectedTypes.length > 0) {
        dataToSave.title = RUNDOWN_ITEM_TYPES[selectedTypes[0]] || 'New Item';
      }
      onSave(dataToSave, true, selectedTypes);
    }
  };

  return (
    <ModalBase onCancel={onCancel} title="Add Item to Rundown" maxWidth="max-w-3xl">
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Type(s)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(RUNDOWN_ITEM_TYPES).map(([abbr, name]) => (
              <label key={abbr} className="flex items-center space-x-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/50">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(abbr)}
                  onChange={() => handleTypeChange(abbr)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">{name} ({abbr})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setTab('existing')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${tab === 'existing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              From Existing Story
            </button>
            <button
              onClick={() => setTab('new')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${tab === 'new' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              As New Blank Item
            </button>
          </nav>
        </div>
        {tab === 'existing' ? (
          <div className="space-y-4">
            <SelectField
              label="Select a Story"
              value={selectedStoryId}
              onChange={e => setSelectedStoryId(e.target.value)}
              options={stories.map(s => ({ value: s.id, label: s.title }))}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <InputField
              label="Title (optional)"
              value={newStoryData.title}
              onChange={e => setNewStoryData({ ...newStoryData, title: e.target.value })}
              placeholder={`Auto-named if left blank`}
            />
            <InputField
              label="Duration"
              value={newStoryData.duration}
              onChange={e => setNewStoryData({ ...newStoryData, duration: e.target.value })}
              placeholder="MM:SS"
            />
            <textarea
              value={newStoryData.content}
              onChange={e => setNewStoryData({ ...newStoryData, content: e.target.value })}
              rows={5}
              className="w-full form-input"
              placeholder="Internal notes or script..."
            />
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={selectedTypes.length === 0}
          >
            <Check className="w-4 h-4" />
            <span>Add to Rundown</span>
          </button>
        </div>
      </div>
    </ModalBase>
  );
};

const ModalBase = ({ children, onCancel, title, maxWidth = "max-w-2xl" }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onCancel}>
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <XCircle className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </div>
  </div>
);

const ConfirmationDialog = ({ onConfirm, onCancel, title, message }) => (
  <ModalBase onCancel={onCancel} title={title} maxWidth="max-w-md">
    <div className="p-6">
      <div className="flex items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  </ModalBase>
);

const PresenterPrintView = ({ rundown, close }) => {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    .print-container { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-controls { display: none; }
                }
            `}</style>
      <div className="fixed inset-0 bg-white z-[100] print-container">
        <div className="print-controls p-4 bg-gray-100 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold">Presenter View: {rundown.name}</h2>
          <div>
            <button onClick={() => window.print()} className="btn-primary mr-2">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={close} className="btn-secondary">Close</button>
          </div>
        </div>
        <div className="p-8 max-w-4xl mx-auto font-serif">
          <h1 className="text-4xl font-bold mb-8 text-center">{rundown.name}</h1>
          <div className="space-y-10">
            {rundown.items.map((item, index) => (
              <div key={item.id} className="break-after-page">
                <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-4">
                  {index + 1}. {item.title} ({item.duration})
                </h2>
                {item.content ? (
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                ) : (
                  <p className="text-lg italic text-gray-500">
                    [No script content for this item]
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const InputField = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input {...props} className="w-full form-input" />
  </div>
);

const SelectField = ({ label, options, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select {...props} className="w-full form-input">
      <option value="">-- Select --</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const GlobalStyles = () => (
  <style>{`
    .form-input { @apply block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm; }
    .btn-primary { @apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 space-x-2 disabled:opacity-50 disabled:cursor-not-allowed; }
    .btn-secondary { @apply inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 space-x-2 disabled:opacity-50 disabled:cursor-not-allowed; }
  `}</style>
);

export default AppWrapper;
