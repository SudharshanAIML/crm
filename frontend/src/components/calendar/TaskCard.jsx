import { useState } from "react";
import { TASK_TYPES, PRIORITY_COLORS, STATUS_COLORS } from "./constants";
import {
  Clock,
  CheckCircle,
  X,
  Video,
  PhoneOff,
  TimerOff,
  Loader2,
  Star,
  Send,
} from "lucide-react";

// Task types that send appointment emails and track responses
const APPOINTMENT_TYPES = new Set(["CALL", "MEETING", "DEMO"]);

// Resolution labels for the feedback form header
const RESOLUTION_LABELS = {
  COMPLETED: { text: "Completed", color: "text-emerald-700" },
  NOT_CONNECTED: { text: "Not Connected", color: "text-red-600" },
  BAD_TIMING: { text: "Bad Timing", color: "text-amber-600" },
};

// Task Card Component
const TaskCard = ({ task, onToggleComplete, onEdit, onDelete, onResolveOverdue, isAdmin = false }) => {
  const config = TASK_TYPES[task.task_type] || TASK_TYPES.OTHER;
  const Icon = config.icon;
  const isCompleted = task.status === "COMPLETED";
  const isOverdue = task.status === "OVERDUE";
  const hasContact = !!task.contact_id;

  // Feedback form state — shows after clicking a resolution/complete action
  const [pendingResolution, setPendingResolution] = useState(null); // which action was picked
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const appointmentStatus = APPOINTMENT_TYPES.has(task.task_type) && hasContact
    ? task.appointment_status
    : null;

  const checkboxHoverColor = isAdmin ? "hover:border-orange-500" : "hover:border-sky-500";

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Step 1: User picks an action → show feedback form (only if task has a contact)
  const handleActionClick = (resolution) => {
    if (!hasContact) {
      // No contact → skip feedback, complete immediately
      submitDirectly(resolution);
      return;
    }
    setPendingResolution(resolution);
    setRating(0);
    setFeedback("");
  };

  // Direct submit without feedback (for tasks without contacts)
  const submitDirectly = async (resolution) => {
    setSubmitting(true);
    try {
      if (isOverdue) {
        await onResolveOverdue(task.task_id, resolution, null, null);
      } else {
        await onToggleComplete(task, null, null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: User fills rating/feedback → submit
  const handleSubmitFeedback = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isOverdue) {
        await onResolveOverdue(task.task_id, pendingResolution, rating || null, feedback || null);
      } else {
        // Normal completion
        await onToggleComplete(task, rating || null, feedback || null);
      }
      setPendingResolution(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelFeedback = () => {
    setPendingResolution(null);
    setRating(0);
    setFeedback("");
  };

  return (
    <div
      className={`
        group p-3 border-l-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors
        ${STATUS_COLORS[task.status]}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox — hidden for overdue tasks (use resolution buttons instead) */}
        {!isOverdue && (
          <button
            onClick={() => {
              if (isCompleted) {
                // Un-complete: no feedback needed
                onToggleComplete(task, null, null);
              } else {
                handleActionClick("COMPLETED");
              }
            }}
            disabled={submitting}
            className={`
              mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
              ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : `border-gray-300 ${checkboxHoverColor}`}
            `}
          >
            {isCompleted && <CheckCircle className="w-3 h-3" />}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 text-${config.color}-500`} />
            <span
              className={`font-medium text-sm ${isCompleted ? "line-through text-gray-400" : "text-gray-800"}`}
            >
              {task.title}
            </span>
            {isOverdue && (
              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                Overdue
              </span>
            )}
            {appointmentStatus && appointmentStatus !== "PENDING" && (
              <span 
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  appointmentStatus === "ACCEPTED" 
                    ? "bg-emerald-100 text-emerald-700" 
                    : appointmentStatus === "RESCHEDULE_REQUESTED"
                    ? "bg-amber-100 text-amber-700"
                    : appointmentStatus === "CANCELLED"
                    ? "bg-red-100 text-red-600"
                    : ""
                }`}
              >
                {appointmentStatus === "ACCEPTED" 
                  ? "✓ Accepted" 
                  : appointmentStatus === "RESCHEDULE_REQUESTED"
                  ? "↻ Reschedule" 
                  : "✕ Cancelled"}
              </span>
            )}
            {appointmentStatus === "PENDING" && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600">
                ◷ Pending
              </span>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {task.due_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(task.due_time)}
              </span>
            )}
            {task.google_meet_link && (
              <a
                href={task.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                title="Join Google Meet"
              >
                <Video className="w-3 h-3" />
                Meet
              </a>
            )}
            {task.contact_name && (
              <span className="truncate max-w-[120px]">
                {task.contact_name}
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority}
            </span>
          </div>

          {/* Overdue Resolution Actions — hidden when feedback form is open */}
          {isOverdue && !pendingResolution && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => handleActionClick("COMPLETED")}
                disabled={submitting}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                title="Mark as completed — contact was reached"
              >
                <CheckCircle className="w-3 h-3" />
                Completed
              </button>
              <button
                onClick={() => handleActionClick("NOT_CONNECTED")}
                disabled={submitting}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                title="Not connected — couldn't reach contact"
              >
                <PhoneOff className="w-3 h-3" />
                Not Connected
              </button>
              <button
                onClick={() => handleActionClick("BAD_TIMING")}
                disabled={submitting}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                title="Bad timing — contact was busy"
              >
                <TimerOff className="w-3 h-3" />
                Bad Timing
              </button>
            </div>
          )}

          {/* Inline Rating & Feedback Form */}
          {pendingResolution && (
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${RESOLUTION_LABELS[pendingResolution]?.color}`}>
                  {RESOLUTION_LABELS[pendingResolution]?.text}
                </span>
                <span className="text-xs text-gray-400">— rate & add notes</span>
              </div>

              {/* Star Rating (1-10) */}
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`p-0 w-5 h-5 flex items-center justify-center transition-colors ${
                      n <= rating ? "text-amber-400" : "text-gray-300 hover:text-amber-300"
                    }`}
                    title={`${n}/10`}
                  >
                    <Star className="w-3.5 h-3.5" fill={n <= rating ? "currentColor" : "none"} />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-1 text-xs text-gray-500 font-medium">{rating}/10</span>
                )}
              </div>

              {/* Feedback text */}
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback or notes..."
                rows={2}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none bg-white"
              />

              {/* Submit / Cancel */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit
                </button>
                <button
                  onClick={handleCancelFeedback}
                  disabled={submitting}
                  className="px-3 py-1 text-xs font-medium rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-gray-200 rounded text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.task_id)}
            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default TaskCard;