import type { Libraries } from '@react-google-maps/api';

export const DEFAULT_VENUE_CENTER = {
  lat: 28.6139,
  lng: 77.2090,
};

export const DEFAULT_MAP_ZOOM = 17;

export const GOOGLE_MAPS_LIBRARIES: Libraries = ['geometry', 'places', 'visualization'];

export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#07111f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b9dc3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#07111f' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#16233b' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2945' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6d84b3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1a2e' }] },
];
