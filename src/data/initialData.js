// src/data/initialData.js
// Initial data for seeding the database
export const initialUsers = [
    { id: 1, name: "Nik", email: "n.ik@example.com", groupId: 1, role: 'Admin' },
    { id: 2, name: "Alice Brown", email: "a.brown@example.com", groupId: 2, role: 'Journalist' },
    { id: 3, name: "Bob Wilson", email: "b.wilson@example.com", groupId: 2, role: 'Journalist' },
    { id: 4, name: "Cathy Jones", email: "c.jones@example.com", groupId: 1, role: 'Producer' },
    { id: 5, name: "David Miller", email: "d.miller@example.com", groupId: 3, role: 'Presenter' },
    { id: 6, name: "Eva Garcia", email: "e.garcia@example.com", groupId: 5, role: 'Editor' },
];

export const initialGroups = [
    { id: 1, name: "Producers" },
    { id: 2, name: "Journalists" },
    { id: 3, name: "Presenters" },
    { id: 4, name: "Engineers" },
    { id: 5, name: "Editors" },
];

export const initialStories = [
    {
        id: 1,
        title: "Breaking: Local Election Results",
        authorId: 2,
        status: "published",
        platform: "broadcast",
        created: "2025-07-15T10:00:00Z",
        scheduled: "2025-07-15T18:00:00Z",
        content: "Election results are coming in fast from across the county. Our reporters are live at key polling stations to bring you the latest updates as they happen. We'll have analysis and reactions from the candidates shortly.",
        tags: ["election", "breaking", "politics"],
        duration: "02:30",
        comments: []
    },
    {
        id: 2,
        title: "Weather Update: Storm Warning",
        authorId: 3,
        status: "draft",
        platform: "web",
        created: "2025-07-15T09:30:00Z",
        scheduled: "2025-07-15T16:00:00Z",
        content: "A severe storm warning has been issued for the tri-state area, effective from 4 PM this afternoon. Meteorologists are predicting high winds, heavy rainfall, and potential flash flooding. Residents are advised to take necessary precautions.",
        tags: ["weather", "warning", "storm"],
        duration: "01:45",
        comments: []
    },
    {
        id: 3,
        title: "City Council Meeting Coverage",
        authorId: 4,
        status: "draft",
        platform: "broadcast",
        created: "2025-07-15T11:00:00Z",
        scheduled: null,
        content: "The city council is set to vote on the new zoning laws today. The controversial proposal has drawn both strong support and fierce opposition from community groups. The meeting is expected to be contentious.",
        tags: ["politics", "local"],
        duration: "03:15",
        comments: []
    },
];

export const initialAssignments = [
    {
        id: 1,
        title: "City Council Meeting Coverage",
        assigneeId: 2,
        deadline: "2025-07-15T14:00:00Z",
        status: "in-progress",
        priority: "high",
        location: "City Hall",
        details: "Cover the vote on the new zoning proposal. Get interviews with council members and community leaders.",
        storyId: 3
    },
    {
        id: 2,
        title: "Follow-up on Election Results",
        assigneeId: 3,
        deadline: "2025-07-16T10:00:00Z",
        status: "assigned",
        priority: "medium",
        location: "N/A",
        details: "Get reactions from the winning and losing candidates. Focus on the impact on local policy.",
        storyId: null
    },
];

export const initialRundowns = [
    {
        id: 1,
        name: "6 PM Newscast",
        archived: false,
        items: [
            {
                id: 1,
                time: "18:00:00",
                title: "Opening Headlines",
                duration: "00:30",
                type: ['LV', 'STD'],
                content: "Good evening, and welcome to the 6 PM Newscast. Tonight, we're tracking the final results of the local election, a severe storm warning is in effect for our area, and the city council makes a decision on a major new development. All that and more, coming up.",
                storyId: null,
                storyStatus: null
            },
            {
                id: 2,
                time: "18:00:30",
                title: "Breaking: Local Election Results",
                duration: "02:30",
                type: ['PKG'],
                content: initialStories.find(s => s.id === 1)?.content || "",
                storyId: 1,
                storyStatus: 'Ready for Air'
            },
            {
                id: 3,
                time: "18:03:00",
                title: "Commercial Break",
                duration: "02:00",
                type: ['BRK'],
                content: "--- COMMERCIAL BREAK ---",
                storyId: null,
                storyStatus: null
            },
        ]
    },
    { id: 2, name: "11 PM Newscast", archived: false, items: [] },
    { id: 3, name: "Morning Show", archived: true, items: [] }
];

export const initialRundownTemplates = [
    {
        id: 1,
        name: "Standard 30-Min Newscast",
        items: [
            { id: 1001, title: "A-Block: Top Stories", duration: "12:00", type: ['PKG', 'VO', 'LV'], content: "" },
            { id: 1002, title: "Commercial Break 1", duration: "02:00", type: ['BRK'], content: "" },
            { id: 1003, title: "B-Block: Weather & Features", duration: "08:00", type: ['PKG', 'VO'], content: "" },
            { id: 1004, title: "Commercial Break 2", duration: "02:00", type: ['BRK'], content: "" },
            { id: 1005, title: "C-Block: Sports & Kicker", duration: "05:00", type: ['VO', 'SOT'], content: "" },
            { id: 1006, title: "Goodnight", duration: "00:30", type: ['STD'], content: "" },
        ]
    }
];