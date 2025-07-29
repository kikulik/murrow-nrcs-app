// src/services/AIService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client with the API key from environment variables.
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Searches the web for a given query, including Georgian language sources.
 *
 * @param {string} query - The search query.
 * @returns {Promise<string>} A formatted string of search results for the AI model.
 */
async function searchWeb(query) {
    const apiKey = import.meta.env.VITE_Google Search_API_KEY;
    const cx = import.meta.env.VITE_Google Search_CX;
    
    // API endpoint for Google Custom Search. We include parameters to search in both English and Georgian.
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&lr=lang_en|lang_ka&cr=countryGE`;

    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error(`Google Search API responded with status: ${response.status}`);
        }
        const data = await response.json();

        // Format the search results into a simple, clean text block for the AI.
        if (data.items) {
            return data.items.slice(0, 5).map(item => `Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n---`).join('\n');
        }
        return "No relevant search results found.";
    } catch (error) {
        console.error("Error fetching search results:", error);
        return `Failed to fetch search results. Error: ${error.message}`;
    }
}

/**
 * Generates a news story using the Gemini Pro model based on a user prompt and web search context.
 *
 * @param {string} prompt - The user's prompt for the story.
 * @returns {Promise<string>} The generated news story.
 */
export const generateStory = async (prompt) => {
    try {
        console.log("Starting AI story generation process...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("Step 1: Searching web for context...");
        const context = await searchWeb(prompt);
        console.log("Step 2: Web search complete. Context retrieved.");

        // This is the master prompt that guides the AI's response.
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

        console.log("Step 3: Sending request to Gemini Pro model...");
        const result = await model.generateContent(masterPrompt);
        const response = await result.response;
        const text = await response.text();
        
        console.log("Step 4: Received response from model. Generation complete.");
        return text;
    } catch (error) {
        console.error("Error generating story with AI:", error);
        return "An error occurred while generating the story. Please check the console for details.";
    }
};
