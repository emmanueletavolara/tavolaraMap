export type POICategory = 'beach' | 'mountain' | 'restaurant' | 'port' | 'landmark';

export interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;
  latitude: number;
  longitude: number;
  images_urls: string[];
  accessibility_info: string;
}