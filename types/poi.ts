export type POICategory = 'beach' | 'mountain' | 'restaurant' | 'port' | 'landmark';

export type POIType = 
  | 'location'    // luogo fisico
  | 'service'     // servizio (bagni, docce, etc.)
  | 'store'       // negozio
  | 'dock'        // pontile/approdo
  | 'activity';   // escursione/attività

export interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;     // zona principale (beach, mountain, etc.)
  type: POIType;            // tipo di POI
  latitude: number;
  longitude: number;
  images_urls: string[];
  accessibility_info: string;
  // Nuovi campi per gestire servizi e attività
  opening_hours?: string;
  price_info?: string;
  booking_required?: boolean;
  contact_info?: string;
}
