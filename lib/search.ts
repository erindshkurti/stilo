import { supabase } from './supabase';

/**
 * Fetch unique service category suggestions based on user input
 */
export async function fetchServiceSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    try {
        const { data, error } = await supabase
            .from('services')
            .select('category')
            .ilike('category', `%${query}%`)
            .limit(10);

        if (error) {
            console.error('Error fetching service suggestions:', error);
            return [];
        }

        // Return unique categories
        return [...new Set(data?.map(s => s.category) || [])];
    } catch (error) {
        console.error('Unexpected error fetching service suggestions:', error);
        return [];
    }
}

/**
 * Fetch unique city suggestions based on user input
 */
export async function fetchLocationSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];

    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('city')
            .ilike('city', `%${query}%`)
            .limit(10);

        if (error) {
            console.error('Error fetching location suggestions:', error);
            return [];
        }

        // Return unique cities
        return [...new Set(data?.map(b => b.city) || [])];
    } catch (error) {
        console.error('Unexpected error fetching location suggestions:', error);
        return [];
    }
}
