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
  Video,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toLocalDateOnly } from "./constants";
import { updateAppointmentStatus, generateMeetLink as generateMeetLinkApi } from "../../services/taskService";

// Task types that send appointment emails and track responses
const APPOINTMENT_TYPES = new Set(["CALL", "MEETING", "DEMO"]);

// Task types eligible for Google Meet link generation
const MEET_ELIGIBLE_TYPES = new Set(["MEETING", "DEMO"]);

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
  // Read directly from task object (t.* already includes appointment_status)
  const isAppointment = APPOINTMENT_TYPES.has(task?.task_type) && !!task?.contact_id;
  const [appointmentStatus, setAppointmentStatus] = useState(
    isAppointment ? (task?.appointment_status || "PENDING") : null
  );
  const [appointmentRespondedAt, setAppointmentRespondedAt] = useState(
    task?.appointment_response_at || null
  );
  const [appointmentNotes, setAppointmentNotes] = useState(
    task?.appointment_notes || null
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Google Meet link state
  const [generateMeetLink, setGenerateMeetLink] = useState(false);
  const [meetLink, setMeetLink] = useState(task?.google_meet_link || null);
  const [generatingMeet, setGeneratingMeet] = useState(false);
  const [meetCopied, setMeetCopied] = useState(false);
  const isMeetEligible = MEET_ELIGIBLE_TYPES.has(formData.task_type) && !!formData.contact_id;

  // Update contact_id when lockedContact changes
  useEffect(() => {
    if (lockedContact && !task?.contact_id) {
      setFormData(prev => ({ ...prev, contact_id: lockedContact.contact_id }));
    }
  }, [lockedContact, task]);

  const handleStatusUpdate = async (newStatus) => {
    if (!task?.task_id) return;
    
    setUpdatingStatus(true);
    try {
      const result = await updateAppointmentStatus(task.task_id, newStatus);
      setAppointmentStatus(result.status);
      setAppointmentRespondedAt(result.respondedAt);
      setAppointmentNotes(result.notes);
    } catch (error) {
      console.error("Failed to update appointment status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateMeetLink = async () => {
    if (!task?.task_id) return;
    
    setGeneratingMeet(true);
    try {
      const result = await generateMeetLinkApi(task.task_id);
      if (result?.google_meet_link) {
        setMeetLink(result.google_meet_link);
      }
    } catch (error) {
      console.error("Failed to generate Meet link:", error);
    } finally {
      setGeneratingMeet(false);
    }
  };

  const handleCopyMeetLink = async () => {
    if (!meetLink) return;
    try {
      await navigator.clipboard.writeText(meetLink);
      setMeetCopied(true);
      setTimeout(() => setMeetCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = meetLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setMeetCopied(true);
      setTimeout(() => setMeetCopied(false), 2000);
    }
  };

  // When Meet link is toggled on, ensure all-day is off and time is required
  const meetLinkRequiresTime = generateMeetLink && isMeetEligible && !task;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.due_date) return;
    // Require time when generating a Meet link
    if (meetLinkRequiresTime && !formData.due_time) return;
    
    setSaving(true);
    await onSave({
      ...formData,
      contact_id: formData.contact_id || null,
      due_time: formData.is_all_day ? null : formData.due_time || null,
      generate_meet_link: generateMeetLink && isMeetEligible,
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
          
          {/* Appointment Status Banner */}
          {isAppointment && (
            <div className={`mt-3 p-3 rounded-lg ${
              appointmentStatus === "ACCEPTED" 
                ? "bg-emerald-50 border border-emerald-200" 
                : appointmentStatus === "RESCHEDULE_REQUESTED"
                ? "bg-amber-50 border border-amber-200"
                : appointmentStatus === "CANCELLED"
                ? "bg-gray-100 border border-gray-300"
                : "bg-blue-50 border border-blue-200"
            }`}>
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 ${
                  appointmentStatus === "ACCEPTED" ? "text-emerald-600" 
                  : appointmentStatus === "RESCHEDULE_REQUESTED" ? "text-amber-600"
                  : appointmentStatus === "CANCELLED" ? "text-gray-600"
                  : "text-blue-600"
                }`}>
                  {appointmentStatus === "ACCEPTED" && <CheckCircle className="w-5 h-5" />}
                  {appointmentStatus === "RESCHEDULE_REQUESTED" && <Clock className="w-5 h-5" />}
                  {appointmentStatus === "CANCELLED" && <X className="w-5 h-5" />}
                  {appointmentStatus === "PENDING" && <CalendarIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${
                    appointmentStatus === "ACCEPTED" ? "text-emerald-800" 
                    : appointmentStatus === "RESCHEDULE_REQUESTED" ? "text-amber-800"
                    : appointmentStatus === "CANCELLED" ? "text-gray-800"
                    : "text-blue-800"
                  }`}>
                    {appointmentStatus === "ACCEPTED" && "Contact Accepted Appointment"}
                    {appointmentStatus === "RESCHEDULE_REQUESTED" && "Reschedule Requested"}
                    {appointmentStatus === "CANCELLED" && "Appointment Cancelled"}
                    {appointmentStatus === "PENDING" && "Awaiting Contact Response"}
                  </p>
                  {appointmentRespondedAt && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Responded: {new Date(appointmentRespondedAt).toLocaleString()}
                    </p>
                  )}
                  {appointmentNotes && (
                    <p className="text-xs text-gray-700 mt-1.5 italic">
                      Note: {appointmentNotes}
                    </p>
                  )}
                  
                  {/* Quick status update buttons */}
                  {appointmentStatus !== "ACCEPTED" && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("RESCHEDULE_REQUESTED")}
                        disabled={updatingStatus || appointmentStatus === "RESCHEDULE_REQUESTED"}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          appointmentStatus === "RESCHEDULE_REQUESTED"
                            ? "bg-amber-200 text-amber-800 cursor-not-allowed"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {appointmentStatus === "RESCHEDULE_REQUESTED" ? "✓ Reschedule Marked" : "Mark Reschedule"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("CANCELLED")}
                        disabled={updatingStatus || appointmentStatus === "CANCELLED"}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          appointmentStatus === "CANCELLED"
                            ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {appointmentStatus === "CANCELLED" ? "✓ Cancelled" : "Mark Cancelled"}
                      </button>
                      {(appointmentStatus === "RESCHEDULE_REQUESTED" || appointmentStatus === "CANCELLED") && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate("PENDING")}
                          disabled={updatingStatus}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time {meetLinkRequiresTime ? "*" : ""}
              </label>
              <input
                type="time"
                value={formData.due_time}
                onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                disabled={formData.is_all_day}
                required={meetLinkRequiresTime}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100 ${
                  meetLinkRequiresTime && !formData.due_time
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200"
                }`}
              />
              {meetLinkRequiresTime && !formData.due_time && (
                <p className="text-xs text-amber-600 mt-1">Required for Meet link</p>
              )}
            </div>
          </div>

          {/* Duration (for timed events) */}
          {!formData.is_all_day && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          )}

          {/* All Day Toggle */}
          <label className={`flex items-center gap-2 ${meetLinkRequiresTime ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={formData.is_all_day}
              onChange={(e) => {
                if (meetLinkRequiresTime) return;
                setFormData({ ...formData, is_all_day: e.target.checked });
              }}
              disabled={meetLinkRequiresTime}
              className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
            />
            <span className="text-sm text-gray-700">All day event</span>
            {meetLinkRequiresTime && (
              <span className="text-xs text-gray-400">(disabled with Meet link)</span>
            )}
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

          {/* Google Meet Link Section - Only for MEETING/DEMO with a contact */}
          {isMeetEligible && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
              {meetLink ? (
                /* Existing Meet link display */
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Google Meet Link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 hover:text-blue-800 truncate underline underline-offset-2"
                    >
                      {meetLink}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyMeetLink}
                      className="p-1.5 rounded-md hover:bg-blue-100 transition-colors text-blue-600"
                      title="Copy link"
                    >
                      {meetCopied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                      href={meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-blue-100 transition-colors text-blue-600"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : task?.task_id ? (
                /* Generate button for existing tasks without a meet link */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Google Meet</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateMeetLink}
                    disabled={generatingMeet}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                  >
                    {generatingMeet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        Generate Meet Link
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Toggle for new tasks */
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Generate Google Meet Link</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={generateMeetLink}
                      onChange={(e) => {
                        setGenerateMeetLink(e.target.checked);
                        // When Meet link is toggled on, turn off all-day mode
                        if (e.target.checked && formData.is_all_day) {
                          setFormData(prev => ({ ...prev, is_all_day: false }));
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-checked:bg-blue-500 rounded-full transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              )}
            </div>
          )}

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
              disabled={saving || !formData.title || (meetLinkRequiresTime && !formData.due_time)}
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