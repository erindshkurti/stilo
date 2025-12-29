export interface Stylist {
    id: string;
    name: string;
    location: string;
    rating: number;
    reviewCount: number;
    imageUrl: string;
    services: string[];
}

export const STYLISTS: Stylist[] = [
    {
        id: '1',
        name: 'Bella Hair Studio',
        location: 'New York, NY',
        rating: 4.9,
        reviewCount: 127,
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        services: ['Haircut', 'Styling', 'Color'],
    },
    {
        id: '2',
        name: 'The Cut Above',
        location: 'Los Angeles, CA',
        rating: 4.8,
        reviewCount: 203,
        imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=300&fit=crop',
        services: ['Haircut', 'Barber', 'Shave'],
    },
    {
        id: '3',
        name: 'Style & Grace',
        location: 'Chicago, IL',
        rating: 5.0,
        reviewCount: 89,
        imageUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=300&fit=crop',
        services: ['Blowout', 'Styling', 'Extensions'],
    },
    {
        id: '4',
        name: 'Urban Cuts',
        location: 'Miami, FL',
        rating: 4.7,
        reviewCount: 156,
        imageUrl: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=400&h=300&fit=crop',
        services: ['Haircut', 'Color', 'Highlights'],
    },
    {
        id: '5',
        name: 'Vogue Salon',
        location: 'New York, NY',
        rating: 4.6,
        reviewCount: 92,
        imageUrl: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&h=300&fit=crop',
        services: ['Manicure', 'Pedicure', 'Nails'],
    },
    {
        id: '6',
        name: 'Pure Beauty',
        location: 'San Francisco, CA',
        rating: 4.8,
        reviewCount: 112,
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop',
        services: ['Facial', 'Skincare', 'Massage'],
    },
    {
        id: '7',
        name: 'Elite Barber',
        location: 'New York, NY',
        rating: 4.9,
        reviewCount: 310,
        imageUrl: 'https://images.unsplash.com/photo-1503951914291-d890b0126780?w=400&h=300&fit=crop',
        services: ['Haircut', 'Beard Trim'],
    },
];
