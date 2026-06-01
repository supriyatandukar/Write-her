import { CONFIG } from './config.js';

export const saveLocal = (data) => {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        alert("Warning: Not enough storage space to save! If you pasted a very large image, try deleting it or making it smaller.");
    }
};

export const loadLocal = () => JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));

export const searchYouTube = async (query) => {
    if (CONFIG.YOUTUBE_API_KEY === 'api key') return [];
    
    // Notice the "&videoEmbeddable=true" added right after the query!
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&videoEmbeddable=true&key=${CONFIG.YOUTUBE_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items; 
    } catch (error) { 
        return []; 
    }
};