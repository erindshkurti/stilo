import { collection, collectionGroup, getDocs, limit as fLimit, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch unique service name or category suggestions based on user input (substring match)
 */
export async function fetchServiceSuggestions(queryStr: string): Promise<string[]> {
    if (!queryStr.trim()) return [];

    try {
        const lowerQuery = queryStr.toLowerCase();
        const servicesRef = collectionGroup(db, 'services');
        
        // Since Firestore doesn't support 'contains' queries, we fetch a larger set
        // and filter client-side. For production, a dedicated search index (Algolia/Elastic) is recommended.
        const q = query(servicesRef, fLimit(200));
        const snapshot = await getDocs(q);

        const suggestions = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const name = data.name as string;
            const category = data.category as string;
            
            if (name?.toLowerCase().includes(lowerQuery)) suggestions.add(name);
            if (category?.toLowerCase().includes(lowerQuery)) suggestions.add(category);
        });
        
        return Array.from(suggestions).sort().slice(0, 10);
    } catch (error) {
        console.error('Error fetching service suggestions:', error);
        return [];
    }
}

/**
 * Fetch unique city suggestions based on user input (substring match)
 */
export async function fetchLocationSuggestions(queryStr: string): Promise<string[]> {
    if (!queryStr.trim()) return [];

    try {
        const lowerQuery = queryStr.toLowerCase();
        const businessesRef = collection(db, 'businesses');
        
        // Fetch a broad set of businesses to extract cities
        const q = query(businessesRef, fLimit(100));
        const snapshot = await getDocs(q);

        const cities = new Set<string>();
        snapshot.docs.forEach(doc => {
            const city = doc.data().city as string;
            if (city?.toLowerCase().includes(lowerQuery)) {
                cities.add(city);
            }
        });
        
        return Array.from(cities).sort().slice(0, 10);
    } catch (error) {
        console.error('Error fetching location suggestions:', error);
        return [];
    }
}
