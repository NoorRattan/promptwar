import React from 'react';
import { Polygon, Circle } from '@react-google-maps/api';
import { ZoneDensity } from '@/types/crowd';

export interface CrowdHeatmapLayerProps {
  zones: ZoneDensity[];
  onZoneClick?: (zoneId: string) => void;
}

export const CrowdHeatmapLayer: React.FC<CrowdHeatmapLayerProps> = ({ zones, onZoneClick }) => {
  const getStyle = (level: string) => {
    switch (level) {
      case 'LOW':
        return { fillColor: '#22C55E', strokeColor: '#16A34A', fillOpacity: 0.35 };
      case 'MEDIUM':
        return { fillColor: '#EAB308', strokeColor: '#CA8A04', fillOpacity: 0.40 };
      case 'HIGH':
        return { fillColor: '#F97316', strokeColor: '#EA580C', fillOpacity: 0.50 };
      case 'CRITICAL':
        return { fillColor: '#EF4444', strokeColor: '#DC2626', fillOpacity: 0.65 };
      default:
        return { fillColor: '#22C55E', strokeColor: '#16A34A', fillOpacity: 0.35 };
    }
  };

  return (
    <>
      {zones.map((zone) => {
        const style = getStyle(zone.level);
        const options = {
          ...style,
          clickable: true,
          strokeWeight: 2,
        };

        const zoneId = zone.id ?? zone.zoneId;
        if (zone.polygon && zone.polygon.length > 0) {
          return (
            <Polygon
              key={zoneId}
              path={zone.polygon}
              options={options}
              onClick={() => onZoneClick?.(zoneId)}
            />
          );
        }

        return (
          <Circle
            key={zoneId}
            center={{ lat: zone.lat_center ?? zone.latCenter ?? 0, lng: zone.lng_center ?? zone.lngCenter ?? 0 }}
            radius={50}
            options={options}
            onClick={() => onZoneClick?.(zoneId)}
          />
        );
      })}
    </>
  );
};
