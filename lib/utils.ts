/**
 * Safely parses a date string (YYYY-MM-DD) and a time string (HH:MM or H:MM AM/PM) 
 * into a local Date object. This avoids common UTC-midnight shift issues when 
 * using `new Date("YYYY-MM-DD")`.
 */
export const parseLocalBookingDate = (date: string | Date, timeStr: string) => {
    let year: number, month: number, day: number;
    
    if (typeof date === 'string') {
        const parts = date.split('-').map(Number);
        year = parts[0];
        month = parts[1] - 1;
        day = parts[2];
    } else {
        year = date.getFullYear();
        month = date.getMonth();
        day = date.getDate();
    }
    
    // Handle both 24h (14:00) and 12h (10:00 AM) formats
    const is12h = timeStr.includes('AM') || timeStr.includes('PM');
    let hours = 0;
    let minutes = 0;

    if (is12h) {
        const [timePart, modifier] = timeStr.split(' ');
        const [h, m] = timePart.split(':').map(Number);
        hours = h;
        minutes = m;
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    } else {
        const [h, m] = timeStr.split(':').map(Number);
        hours = h;
        minutes = m;
    }
    
    return new Date(year, month, day, hours, minutes, 0, 0);
};

/**
 * Safely parses a YYYY-MM-DD string into a local Date object.
 * This avoids UTC-related day shifts.
 */
export const parseLocalYYYYMMDD = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * Returns a YYYY-MM-DD string for the current local date.
 */
export const getLocalTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
