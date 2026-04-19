import { useEffect, useRef, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui';
import apiClient from '@/lib/api/client';
import { useVenueStore } from '@/store/venueStore';

type ChartPayload = {
  cols: Array<{ label: string; type: string }>;
  rows: Array<{ c?: Array<{ v: string | number | null }> }>;
};

type GoogleChartsWindow = Window & {
  google?: {
    charts?: {
      load: (version: string, packages: { packages: string[] }) => void;
      setOnLoadCallback: (callback: () => void) => void;
    };
    visualization?: {
      arrayToDataTable: (rows: Array<Array<string | number | null>>) => unknown;
      LineChart: new (element: Element) => {
        draw: (data: unknown, options: unknown) => void;
      };
    };
  };
};

export default function AnalyticsPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPayload | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!currentVenue?.id) {
        return;
      }

      try {
        await apiClient.get('/analytics/summary', { params: { venue_id: currentVenue.id } });
        setSummaryError(null);
      } catch {
        setSummaryError('Summary endpoint is currently unavailable.');
      }

      try {
        const response = await apiClient.get<ChartPayload>('/analytics/orders/chart', {
          params: { venue_id: currentVenue.id },
        });
        setChartData(response.data);
      } catch {
        setChartData(null);
      }
    };

    void loadData();
  }, [currentVenue?.id]);

  useEffect(() => {
    const googleCharts = (window as unknown as GoogleChartsWindow).google;
    if (!googleCharts?.charts || !googleCharts.visualization || !chartData || !chartRef.current) {
      return;
    }

    googleCharts.charts.load('current', { packages: ['corechart'] });
    googleCharts.charts.setOnLoadCallback(() => {
      if (!chartRef.current) {
        return;
      }

      const rows = chartData.rows.map((row) => row.c?.map((cell) => cell.v ?? null) ?? []);
      const dataTable = googleCharts.visualization.arrayToDataTable([
        chartData.cols.map((column) => column.label),
        ...rows,
      ]);

      const ChartConstructor =
        googleCharts.visualization.LineChart as unknown as new (element: Element) => {
          draw: (data: unknown, options: unknown) => void;
        };
      const chart = new ChartConstructor(chartRef.current);
      chart.draw(dataTable, {
        backgroundColor: 'transparent',
        legend: { textStyle: { color: '#8B9DC3' } },
        chartArea: { left: 40, right: 20, top: 20, bottom: 40 },
        hAxis: { textStyle: { color: '#8B9DC3' } },
        vAxis: { textStyle: { color: '#8B9DC3' } },
        colors: ['#3B82F6'],
      });
    });
  }, [chartData]);

  return (
    <AdminLayout title="Analytics">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="page-copy mb-4">
            <h2 className="text-title">Orders Over Time</h2>
            <p className="text-meta">Rendered with Google Charts when the chart loader is available.</p>
          </div>
          <div ref={chartRef} className="min-h-[320px]" />
          {!chartData ? <p className="text-meta">Order chart data is currently empty.</p> : null}
        </Card>

        <Card className="p-5">
          <div className="page-copy">
            <h2 className="text-title">Summary</h2>
            <p className="text-meta">
              {summaryError ?? 'Analytics summary loaded successfully.'}
            </p>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
