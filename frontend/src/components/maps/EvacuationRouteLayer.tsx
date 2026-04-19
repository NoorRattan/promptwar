import React from 'react';
import { Polyline, Marker } from '@react-google-maps/api';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface EvacuationRouteLayerProps {
  route: google.maps.LatLngLiteral[];
}

const EXIT_SVG = 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23EF4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';

export const EvacuationRouteLayer: React.FC<EvacuationRouteLayerProps> = ({ route }) => {
  const prefersReducedMotion = useReducedMotion();

  if (!route || route.length === 0) return null;
  const endPoint = route[route.length - 1];

  return (
    <>
      <Polyline
        path={route}
        options={{
          strokeColor: '#EF4444',
          strokeWeight: 6,
          strokeOpacity: 0.9,
          zIndex: 900,
        }}
      />

      {!prefersReducedMotion && (
        <Polyline
          path={route}
          options={{
            strokeColor: '#FCA5A5',
            strokeWeight: 10,
            strokeOpacity: 0.4,
            zIndex: 910,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#FCA5A5',
                  fillOpacity: 0.8,
                  strokeOpacity: 0,
                },
                offset: '0%',
                repeat: '60px',
              },
            ],
          }}
        />
      )}

      <Marker
        position={endPoint}
        icon={{
          url: EXIT_SVG,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        }}
        label={{
          text: 'EXIT',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
        zIndex={1000}
      />
    </>
  );
};
