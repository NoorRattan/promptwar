import apiClient from '@/lib/api/client'

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'escalated'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface StaffTask {
  id: string
  assigned_to_name: string
  assigned_to_id: string
  zone_id: string
  zone_name: string
  task_type: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  due_at: string
  created_at: string
}

export interface CreateTaskPayload {
  assigned_to_id: string
  zone_id: string
  task_type: string
  description: string
  priority: TaskPriority
  due_at: string
}

export async function getTasks(venueId: string): Promise<StaffTask[]> {
  const { data } = await apiClient.get<StaffTask[]>(`/staff/tasks?venue_id=${venueId}`)
  return data
}

export async function createTask(payload: CreateTaskPayload): Promise<StaffTask> {
  const { data } = await apiClient.post<StaffTask>('/staff/tasks', payload)
  return data
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<StaffTask> {
  const { data } = await apiClient.patch<StaffTask>(`/staff/tasks/${taskId}/status`, { status })
  return data
}
