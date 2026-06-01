export const generateId = () => Math.random().toString(36).substr(2, 9);

export const countWords = (text) => {
    // Strip HTML tags before counting
    const trimmed = text.replace(/<[^>]*>?/gm, ' ').trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
};