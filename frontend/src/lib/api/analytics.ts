import apiClient from '@/lib/api/client'

export interface AnalyticsSummary {
  total_orders_today: number
  total_revenue_today: number
  average_prep_time_minutes: number
  busiest_zone_name: string
  peak_crowd_percent: number
  active_incidents: number
  seat_upgrades_accepted: number
  upgrade_revenue_today: number
}

export interface OrderChartDataPoint {
  hour: string        // "14:00"
  order_count: number
  revenue: number
}

export async function getAnalyticsSummary(venueId: string): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get<AnalyticsSummary>(
    `/analytics/summary?venue_id=${venueId}`
  )
  return data
}

export async function getOrderChartData(venueId: string): Promise<OrderChartDataPoint[]> {
  const { data } = await apiClient.get<OrderChartDataPoint[]>(
    `/analytics/orders/chart?venue_id=${venueId}`
  )
  return data
}
