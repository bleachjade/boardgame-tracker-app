export const calculateScoreString = (input: string): number => {
    let sanitized = input.replace(/[^0-9+\-*/().]/g, "");
    sanitized = sanitized.replace(/\b0+(?=\d)/g, "");
    if (!sanitized) return 0;
    try {
        const total = new Function(`return ${sanitized}`)();
        return typeof total === "number" && !isNaN(total) ? total : 0;
    } catch {
        return 0;
    }
};

export const createMarkup = (html: string) => {
    if (!html) return { __html: "No description provided." };
    return { __html: html.replace(/&#10;/g, '<br/>').replace(/&mdash;/g, '—').replace(/&quot;/g, '"') };
};