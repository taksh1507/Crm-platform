import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface CreateTaskRequest {
  application_id: string;
  task_type: "call" | "email" | "review";
  due_at: string;
}

interface CreateTaskResponse {
  success: boolean;
  task_id?: string;
  error?: string;
}

// Check if the due date is valid and in the future
function validateDueAt(dueAtString: string): {
  valid: boolean;
  error?: string;
  date?: Date;
} {
  try {
    const dueAt = new Date(dueAtString);

    if (isNaN(dueAt.getTime())) {
      return {
        valid: false,
        error: "Invalid ISO timestamp format",
      };
    }

    const now = new Date();
    if (dueAt <= now) {
      return {
        valid: false,
        error: "due_at must be in the future",
      };
    }

    return {
      valid: true,
      date: dueAt,
    };
  } catch {
    return {
      valid: false,
      error: "Invalid ISO timestamp format",
    };
  }
}

// Make sure the task type is one we support
function validateTaskType(
  taskType: string
): taskType is "call" | "email" | "review" {
  return ["call", "email", "review"].includes(taskType);
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Only POST requests allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // Parse the request body
    let body: CreateTaskRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check required fields
    if (!body.application_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "application_id is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!body.task_type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "task_type is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (!body.due_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "due_at is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate the application_id is a proper UUID
    if (!isValidUUID(body.application_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "application_id must be a valid UUID",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check task type is valid
    if (!validateTaskType(body.task_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'task_type must be one of: "call", "email", "review"',
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate due_at is in the future
    const dueAtValidation = validateDueAt(body.due_at);
    if (!dueAtValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: dueAtValidation.error,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Set up database connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the tenant_id from the application
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("tenant_id")
      .eq("id", body.application_id)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Application not found",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Create the task in the database
    const { data: task, error: insertError } = await supabase
      .from("tasks")
      .insert({
        application_id: body.application_id,
        type: body.task_type,
        due_at: body.due_at,
        tenant_id: application.tenant_id,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !task) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create task",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Send realtime event to notify subscribers
    try {
      const channel = supabase.channel(`tenant:${application.tenant_id}`);
      channel.on("broadcast", { event: "task.created" }, (payload: any) => {
        // Event subscription handler
      });

      channel.subscribe(async (status: any) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "task.created",
            payload: {
              task_id: task.id,
              application_id: body.application_id,
              task_type: body.task_type,
              due_at: body.due_at,
              tenant_id: application.tenant_id,
              created_at: new Date().toISOString(),
            },
          });
          channel.unsubscribe();
        }
      });
    } catch (realtimeError) {
      console.error("Realtime event error:", realtimeError);
      // Continue even if realtime fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
