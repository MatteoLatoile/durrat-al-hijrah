export type PropertyType = 'apartment' | 'villa' | 'land' | 'building' | 'shop';
export type Transaction = 'rent' | 'sale';
export type District = 'arid' | 'qurban' | 'awali';
export type Property = {
  id: number;
  titleKey: 'a' | 'b' | 'c';
  type: PropertyType;
  transaction: Transaction;
  district: District;
  price: number;
  area: number;
  beds: number;
  baths: number;
  imageUrl: string;
  imageClass: string;
};

// These are FICTIONAL visual samples, not actual client properties.
export const sampleProperties: Property[] = [
  {id: 1001, titleKey: 'a', type: 'apartment', transaction: 'rent', district: 'arid',
    price: 42000, area: 165, beds: 3, baths: 2, imageClass: 'image-one',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=82'},
  {id: 1002, titleKey: 'b', type: 'villa', transaction: 'sale', district: 'awali',
    price: 1850000, area: 420, beds: 5, baths: 4, imageClass: 'image-two',
    imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1100&q=82'},
  {id: 1003, titleKey: 'c', type: 'apartment', transaction: 'rent', district: 'qurban',
    price: 56000, area: 210, beds: 4, baths: 3, imageClass: 'image-three',
    imageUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=82'}
];
