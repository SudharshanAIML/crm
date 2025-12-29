import { useState, useEffect, useMemo } from "react";
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
import { toLocalDateOnly } from "./constants";

// Task Modal Component
const TaskModal= ({ isOpen, task, contacts, selectedDate, onClose, onSave, lockedContact }) => {
  // Helper to format date in local timezone
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    task_type: task?.task_type || "FOLLOW_UP",
    priority: task?.priority || "MEDIUM",
    due_date: task?.due_date ? toLocalDateOnly(task.due_date) : formatLocalDate(selectedDate),
    due_time: task?.due_time?.substring(0, 5) || "",
    duration_minutes: task?.duration_minutes || 30,
    contact_id: task?.contact_id || lockedContact?.contact_id || "",
    is_all_day: task?.is_all_day || false,
  });
  const [saving, setSaving] = useState(false);

  // Update contact_id when lockedContact changes
  useEffect(() => {
    if (lockedContact && !task?.contact_id) {
      setFormData(prev => ({ ...prev, contact_id: lockedContact.contact_id }));
    }
  }, [lockedContact, task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) return;
    
    setSaving(true);
    await onSave({
      ...formData,
      contact_id: formData.contact_id || null,
      due_time: formData.is_all_day ? null : formData.due_time || null,
    });
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {task ? "Edit Task" : "Add New Task"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Task title"
              required
            />
          </div>

          {/* Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {Object.entries(TASK_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                disabled={formData.is_all_day}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* All Day Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_all_day}
              onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
            <span className="text-sm text-gray-700">All day event</span>
          </label>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related Contact</label>
            <select
              value={formData.contact_id}
              onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">No contact</option>
              {contacts.map((contact) => (
                <option key={contact.contact_id} value={contact.contact_id}>
                  {contact.name} - {contact.email}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="Add notes or details..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : task ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default TaskModal;