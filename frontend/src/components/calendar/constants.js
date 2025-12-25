import {
  Calendar as CalendarIcon,
  Phone,
  Mail,
  Users,
  Target,
  Bell,
  AlertCircle,
  Zap,
} from "lucide-react";

export const TASK_TYPES = {
  FOLLOW_UP: { icon: Target, color: "sky", label: "Follow-up" },
  CALL: { icon: Phone, color: "green", label: "Call" },
  MEETING: { icon: Users, color: "purple", label: "Meeting" },
  EMAIL: { icon: Mail, color: "blue", label: "Email" },
  DEMO: { icon: Zap, color: "orange", label: "Demo" },
  DEADLINE: { icon: AlertCircle, color: "red", label: "Deadline" },
  REMINDER: { icon: Bell, color: "amber", label: "Reminder" },
  OTHER: { icon: CalendarIcon, color: "gray", label: "Other" },
};

export const PRIORITY_COLORS = {
  LOW: "bg-gray-100 text-gray-600 border-gray-200",
  MEDIUM: "bg-blue-100 text-blue-600 border-blue-200",
  HIGH: "bg-orange-100 text-orange-600 border-orange-200",
  URGENT: "bg-red-100 text-red-600 border-red-200",
};

export const STATUS_COLORS = {
  PENDING: "border-l-amber-400",
  IN_PROGRESS: "border-l-blue-400",
  COMPLETED: "border-l-emerald-400 opacity-60",
  CANCELLED: "border-l-gray-300 opacity-40",
  OVERDUE: "border-l-red-500",
};
export const toLocalDateOnly = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr); // parse UTC properly
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};