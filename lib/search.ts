import { collection, collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetch unique service name or category suggestions based on user input (prefix match)
 */
export async function fetchServiceSuggestions(queryStr: string): Promise<string[]> {
    if (!queryStr.trim()) return [];

    try {
        const formattedQuery = queryStr.charAt(0).toUpperCase() + queryStr.slice(1).toLowerCase();
        const servicesRef = collectionGroup(db, 'services');
        
        // Firestore range query for prefix matching
        // We do two queries: one for category and one for name (display name)
        const qCat = query(
            servicesRef,
            where('category', '>=', formattedQuery),
            where('category', '<=', formattedQuery + '\uf8ff'),
            limit(10)
        );

        const qName = query(
            servicesRef,
            where('name', '>=', formattedQuery),
            where('name', '<=', formattedQuery + '\uf8ff'),
            limit(10)
        );

        const [snapCat, snapName] = await Promise.all([
            getDocs(qCat),
            getDocs(qName)
        ]);

        const suggestions = new Set<string>();
        snapCat.docs.forEach(doc => suggestions.add(doc.data().category as string));
        snapName.docs.forEach(doc => suggestions.add(doc.data().name as string));
        
        return Array.from(suggestions).sort();
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
