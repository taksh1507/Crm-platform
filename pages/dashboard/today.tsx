import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { NextPage } from "next";

// Initialize Supabase client with public credentials
// RLS policies handle row-level security, so this is safe for the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Shape of task data from the database
interface Task {
  id: string;
  application_id: string;
  type: "call" | "email" | "review";
  status: string;
  due_at: string;
}

// Fetch tasks due today
// We query for tasks between midnight and midnight UTC
// Only pending tasks are included since we're viewing the work queue
async function getTodaysTasks(): Promise<Task[]> {
  // Get today's date range in UTC
  const now = new Date();
  const isoString = now.toISOString();
  const todayStart = isoString.split('T')[0] + 'T00:00:00.000Z';
  const tomorrowStart = new Date(now);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const todayEnd = tomorrowStart.toISOString().split('T')[0] + 'T00:00:00.000Z';

  // Retrieve items within today's window, excluding completed work
  const { data, error } = await supabase
    .from("tasks")
    .select("id, application_id, type, status, due_at")
    .gte("due_at", todayStart)
    .lt("due_at", todayEnd)
    .neq("status", "completed")
    .order("due_at", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return data || [];
}

// Update a task's status to completed
// Used when team members mark their work as done
async function markTaskComplete(taskId: string): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", taskId);

  if (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to mark task complete");
  }
}

// Format a timestamp for display in user's local time
// e.g., "2:30 PM" instead of the full ISO string
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Return Tailwind CSS classes based on task type
// Makes it easy to see what kind of work needs to be done at a glance
function getTaskTypeBadgeClass(type: string): string {
  switch (type) {
    case "call":
      return "bg-blue-100 text-blue-800";
    case "email":
      return "bg-purple-100 text-purple-800";
    case "review":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Color coding for task status badges
// Green = done, Yellow = needs work, Red = overdue
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Main dashboard component for viewing and managing today's tasks
const DashboardToday: NextPage = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch today's tasks using React Query
  // Auto-refreshes every 60 seconds to stay in sync with the server
  const {
    data: tasks = [],
    isLoading,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: getTodaysTasks,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Mutation for marking tasks as complete
  // Automatically refreshes the task list after a successful update
  const completeMutation = useMutation({
    mutationFn: (taskId: string) => markTaskComplete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "today"] });
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Show any errors that happen during fetching
  useEffect(() => {
    if (isError && fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch tasks");
    }
  }, [isError, fetchError]);

  // When user clicks the complete button, update that task
  const handleMarkComplete = (taskId: string) => {
    completeMutation.mutate(taskId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page header with date context */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Today's Tasks</h1>
          <p className="text-gray-600 mt-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Error notification panel */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Data loading animation */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Content area: empty state or task listing */}
        {!isLoading && (
          <>
            {tasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No tasks due today</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {/* Agenda table: displays work items with actions */}
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Column headers with sort context */}
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Application
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Due Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  {/* Task rows with inline editing capability */}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 transition">
                        {/* Task category badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTaskTypeBadgeClass(
                              task.type
                            )}`}
                          >
                            {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                          </span>
                        </td>
                        {/* Parent record reference (truncated) */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {task.application_id.slice(0, 8)}...
                          </code>
                        </td>
                        {/* Scheduled deadline in user timezone */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(task.due_at)}
                        </td>
                        {/* Current workflow state */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </span>
                        </td>
                        {/* Completion trigger: submit to mark as done */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {task.status !== "completed" && (
                            <button
                              onClick={() => handleMarkComplete(task.id)}
                              disabled={completeMutation.isPending}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                              {completeMutation.isPending ? "Updating..." : "Mark Complete"}
                            </button>
                          )}
                          {task.status === "completed" && (
                            <span className="text-gray-500">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary metrics: high-level task breakdown */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {/* Total count: all work items */}
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-medium">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              {/* Incomplete items: awaiting action */}
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter((t) => t.status === "pending").length}
                </p>
              </div>
              {/* Finished work: successfully closed items */}
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-gray-600 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter((t) => t.status === "completed").length}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardToday;
