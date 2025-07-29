// src/services/AIService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Vite will automatically replace 'import.meta.env.VITE_GEMINI_API_KEY' 
// with the actual key from your .env file during the build process.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

async function searchWeb(query) {
    // Access the variables directly. Do not assign them here.
    const apiKey = import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const cx = import.meta.env.VITE_GOOGLE_SEARCH_CX;
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&lr=lang_en|lang_ka&cr=countryGE`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Google Search API responded with status: ${response.status}`);
        }
        const data = await response.json();

        if (data.items) {
            return data.items.slice(0, 5).map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n---`).join('\n');
        }
        return "No relevant search results found.";
    } catch (error) {
        console.error("Error fetching search results:", error);
        return `Failed to fetch search results. Error: ${error.message}`;
    }
}

export const generateStory = async (prompt) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const context = await searchWeb(prompt);

        const masterPrompt = `
            You are a professional news editor for a neutral international news agency.
            Your task is to write a factual, unbiased news story based *only* on the provided context below.
            Do not invent any details or use any information outside of the provided text.
            The user's original request was: "${prompt}".
            
            Here are the search results to use as your source:
            ---
            ${context}
            ---

            Based on the information above, please generate a well-structured news story.
        `;

        const result = await model.generateContent(masterPrompt);
        const response = await result.response;
        const text = await response.text();
        
        return text;
    } catch (error) {
        console.error("Error generating story with AI:", error);
        return "An error occurred while generating the story. Please check the console for details.";
    }
};
