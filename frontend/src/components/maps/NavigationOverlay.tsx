import React from 'react';
import { Polyline, Marker } from '@react-google-maps/api';

export interface NavigationOverlayProps {
  route: google.maps.LatLngLiteral[];
  color?: string;
}

const START_SVG = 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322C55E"><circle cx="12" cy="12" r="10"/></svg>';
const END_SVG = 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233B82F6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({ route, color = '#3B82F6' }) => {
  if (!route || route.length === 0) return null;

  const startPoint = route[0];
  const endPoint = route[route.length - 1];

  return (
    <>
      <Polyline
        path={route}
        options={{
          strokeColor: color,
          strokeWeight: 5,
          strokeOpacity: 0.9,
          geodesic: true,
        }}
      />
      
      <Marker
        position={startPoint}
        icon={{
          url: START_SVG,
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12),
        }}
        title="You"
        label="You"
      />
      
      <Marker
        position={endPoint}
        icon={{
          url: END_SVG,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32),
        }}
        title="Dest"
        label="Dest"
      />
    </>
  );
};
