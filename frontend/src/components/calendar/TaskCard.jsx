import { TASK_TYPES, PRIORITY_COLORS, STATUS_COLORS } from "./constants";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Phone,
  Mail,
  Users,
  Target,
  Bell,
  CheckCircle,
  AlertCircle,
  X,
  Filter,
  Zap,
  CalendarDays,
  ListTodo,
  RefreshCw,
} from "lucide-react";
// Task Card Component
const TaskCard = ({ task, onToggleComplete, onEdit, onDelete }) => {
  const config = TASK_TYPES[task.task_type] || TASK_TYPES.OTHER;
  const Icon = config.icon;
  const isCompleted = task.status === "COMPLETED";
  const isOverdue = task.status === "OVERDUE";

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div
      className={`
        group p-3 border-l-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors
        ${STATUS_COLORS[task.status]}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task)}
          className={`
            mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-sky-500"}
          `}
        >
          {isCompleted && <CheckCircle className="w-3 h-3" />}
        </button>

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
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {task.due_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(task.due_time)}
              </span>
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