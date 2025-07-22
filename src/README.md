// README.md file structure documentation

# Murrow NRCS - Modular Structure

## Project Structure

```
src/
├── components/           # Shared, reusable UI components
│   ├── ui/              # Generic UI elements
│   │   ├── InputField.jsx
│   │   ├── SelectField.jsx
│   │   └── GlobalStyles.jsx
│   ├── common/          # More complex shared components
│   │   ├── ModalBase.jsx
│   │   ├── ConfirmationDialog.jsx
│   │   ├── Chatbox.jsx
│   │   └── ModalManager.jsx
│   └── modals/          # Specific modal components
│       ├── RundownEditor.jsx
│       └── AddStoryToRundownModal.jsx
├── context/             # React Context providers
│   ├── AuthContext.jsx  # Contains AuthProvider and useAuth
│   └── AppContext.jsx   # Main app state management
├── features/            # Major app sections or "features"
│   ├── auth/
│   │   └── AuthPage.jsx
│   ├── stories/
│   │   ├── StoriesTab.jsx
│   │   └── components/
│   │       ├── StoryCard.jsx
│   │       ├── StoryEditor.jsx
│   │       ├── CollapsibleVideoSection.jsx
│   │       └── SendStoryToRundownModal.jsx
│   ├── rundown/
│   │   ├── RundownTab.jsx
│   │   ├── LiveModeTab.jsx
│   │   └── components/
│   │       ├── RundownList.jsx
│   │       ├── RundownDraggableItem.jsx
│   │       ├── RundownItemEditor.jsx
│   │       └── PrintDropdown.jsx
│   ├── assignments/
│   │   ├── AssignmentsTab.jsx
│   │   └── components/
│   │       └── AssignmentEditor.jsx
│   ├── admin/
│   │   ├── AdminTab.jsx
│   │   └── components/
│   │       ├── UserEditor.jsx
│   │       ├── GroupEditor.jsx
│   │       └── TemplateEditor.jsx
│   ├── policies/        # Group policies management (future)
│   │   ├── GroupPolicy.jsx     # Group-level policies
│   │   └── UserPermissions.jsx # Individual user overrides
│   └── MurrowNRCS.jsx   # Main application component
├── hooks/               # Custom React hooks
│   ├── useFirestoreData.js  # Firestore listeners management
│   └── useLiveMode.js       # Live mode functionality
├── lib/                 # Core libraries and configurations
│   ├── firebase.js      # Firebase configuration and initialization
│   ├── permissions.js   # PERMISSIONS constant and related functions
│   └── constants.js     # All app constants
├── utils/               # Pure helper functions
│   ├── helpers.js       # General utilities (formatDuration, etc)
│   ├── styleHelpers.js  # Style-related functions
│   └── iconHelpers.js   # Icon mapping functions
├── services/            # Business logic and external APIs
│   ├── FirebaseService.js   # Database operations service
│   └── PrintService.js      # Printing and export service
├── media/               # Media integration code
│   ├── MediaManager.js      # Media ID generation and validation
│   └── StoryVideoIntegration.js  # Video integration hooks
├── data/                # Initial/seed data
│   └── initialData.js   # Database seeding data
├── App.jsx              # Main app router and wrapper
└── index.js             # Application entry point
```

## 🎯 **Key Benefits of This Structure**

### **1. Modularity & Separation of Concerns**
- Each feature is self-contained with its own components
- Clear boundaries between UI, business logic, and data layers
- Easy to understand what each part does

### **2. Scalability**
- Add new features without touching existing code
- Components can be easily extended or replaced
- Service layer abstracts complex operations

### **3. Team Collaboration**
- Multiple developers can work on different features simultaneously
- Clear ownership and responsibility boundaries
- Consistent patterns across the application

### **4. Maintainability**
- Bugs are easier to locate and fix
- Code changes have limited blast radius
- Clear dependency management

### **5. Testability**
- Pure functions in utils are easily testable
- Services can be mocked for component testing
- Clear separation of concerns aids testing

## 🔮 **Future Implementation Ready**

### **Group Policies System** (Located in `/features/policies/`)
```javascript
// Example of future group policy implementation
const GroupPolicy = {
  canCreateStories: boolean,
  canEditOwnStories: boolean,
  canEditAnyStories: boolean,
  canDeleteStories: boolean,
  canManageRundowns: boolean,
  canGoLive: boolean,
  maxStoriesPerDay: number,
  requiresApproval: boolean,
  allowedPlatforms: string[],
  restrictedItemTypes: string[]
}

// User permission overrides
const UserPermissions = {
  userId: string,
  groupPolicyOverrides: Partial<GroupPolicy>,
  customPermissions: object,
  expiresAt: Date
}
```

### **Enhanced Media Integration** (Already structured in `/media/`)
- Video upload handling
- NLE system integration
- Media asset management
- Automated transcoding workflows

## 📋 **Implementation Checklist**

### **✅ Completed**
- [x] Modular file structure
- [x] Component separation
- [x] Service layer architecture
- [x] Context-based state management
- [x] Video integration framework
- [x] Print/export services
- [x] Authentication system
- [x] Permission system foundation

### **🔄 Ready for Implementation**
- [ ] Group policies enforcement
- [ ] Individual user permission overrides
- [ ] Advanced media workflows
- [ ] Real-time collaborative editing
- [ ] Advanced notification system
- [ ] Audit logging
- [ ] Advanced analytics
- [ ] Mobile responsive optimizations

## 🚀 **Usage Patterns**

### **Adding a New Feature**
1. Create folder in `/features/newfeature/`
2. Add main tab component
3. Create `/components/` subfolder for feature-specific UI
4. Add any needed services to `/services/`
5. Update routing in `MurrowNRCS.jsx`
6. Add permissions to `/lib/permissions.js`

### **Adding New Components**
- **Feature-specific**: Place in `/features/[feature]/components/`
- **Reusable**: Place in `/components/ui/` or `/components/common/`
- **Modal**: Place in `/components/modals/`

### **Adding Business Logic**
- **Database operations**: Add to `FirebaseService`
- **External APIs**: Create new service file
- **Utilities**: Add to appropriate file in `/utils/`

### **State Management**
- **Global state**: Use `AppContext`
- **Authentication**: Use `AuthContext`
- **Component state**: Use local `useState`
- **Complex logic**: Create custom hooks in `/hooks/`

## 🔧 **Migration Notes**

The original monolithic code has been broken down while preserving:
- ✅ All existing functionality
- ✅ Firebase integration
- ✅ Drag-and-drop capabilities
- ✅ Live mode features
- ✅ Video integration hooks
- ✅ Print/export functionality
- ✅ Permission system
- ✅ Real-time chat
- ✅ Modal management

## 🎨 **Architecture Principles**

1. **Feature-First Organization** - Related code lives together
2. **Clear Dependencies** - Services depend on lib, features depend on components
3. **Separation of Concerns** - UI, logic, and data are cleanly separated
4. **Consistent Patterns** - Same patterns used throughout the app
5. **Future-Proof Design** - Structure supports planned enhancements

This modular structure provides a solid foundation for scaling your NRCS application while maintaining code quality and developer productivity.