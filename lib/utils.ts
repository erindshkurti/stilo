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
    
    // Handle both 24h (14:00) and 12h (10:00 AM) formats robustly
    let hours = 0;
    let minutes = 0;
    
    // Regex matches HH:MM and optionally AM/PM with any (or no) whitespace
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    
    if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const modifier = match[3]?.toUpperCase();
        
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
    }
    
    const result = new Date(year, month, day, hours, minutes, 0, 0);
    
    // Safety check: Ensure the date is valid before returning
    if (isNaN(result.getTime())) {
        console.error('Invalid Date generated:', { year, month, day, hours, minutes, timeStr });
        return new Date(); // Fallback to current time instead of throwing RangeError
    }
    
    return result;
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
