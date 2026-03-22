import { collection, collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch unique service category suggestions based on user input (prefix match)
 */
export async function fetchServiceSuggestions(queryStr: string): Promise<string[]> {
    if (!queryStr.trim()) return [];

    try {
        const formattedQuery = queryStr.charAt(0).toUpperCase() + queryStr.slice(1).toLowerCase();
        
        // Firestore range query for prefix matching on category
        const servicesRef = collectionGroup(db, 'services');
        const q = query(
            servicesRef,
            where('category', '>=', formattedQuery),
            where('category', '<=', formattedQuery + '\uf8ff'),
            limit(20)
        );

        const snapshot = await getDocs(q);
        const categories = snapshot.docs.map(doc => doc.data().category as string);
        return [...new Set(categories)];
    } catch (error) {
        console.error('Error fetching service suggestions:', error);
        return [];
    }
}

/**
 * Fetch unique city suggestions based on user input (prefix match)
 */
export async function fetchLocationSuggestions(queryStr: string): Promise<string[]> {
    if (!queryStr.trim()) return [];

    try {
        const businessesRef = collection(db, 'businesses');
        const q = query(
            businessesRef,
            where('city', '>=', queryStr),
            where('city', '<=', queryStr + '\uf8ff'),
            limit(20)
        );

        const snapshot = await getDocs(q);
        const cities = snapshot.docs.map(doc => doc.data().city as string);
        return [...new Set(cities)];
    } catch (error) {
        console.error('Error fetching location suggestions:', error);
        return [];
    }
}
