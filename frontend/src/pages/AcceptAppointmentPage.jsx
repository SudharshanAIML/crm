import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Calendar } from "lucide-react";

/**
 * Public appointment acceptance page (no auth required)
 * Acts as proxy between email link and backend API
 * Hides backend URL from email recipients
 */
const AcceptAppointmentPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | success | error | invalid
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const acceptAppointment = async () => {
      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        // Call backend API (proxied through frontend)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/appointments/accept/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 204) {
          // Success - no content returned
          setStatus("success");
        } else if (response.status >= 400) {
          // Error responses
          setStatus("error");
          setErrorMessage(response.status === 404 ? "Appointment not found" : "Failed to confirm appointment");
        } else {
          setStatus("success");
        }
      } catch (error) {
        console.error("Appointment acceptance error:", error);
        setStatus("error");
        setErrorMessage("Network error - please check your connection");
      }
    };

    acceptAppointment();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        {/* Loading State */}
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Confirming Appointment</h1>
            <p className="text-gray-600">Please wait while we process your confirmation...</p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-emerald-700 mb-3">Appointment Accepted!</h1>
            <p className="text-gray-700 text-lg mb-6">
              Your appointment has been confirmed successfully.
            </p>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-emerald-800">
                <Calendar className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Your representative has been notified of your acceptance.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>✓ Confirmation email sent</p>
              <p>✓ Calendar updated</p>
              <p>✓ Reminder scheduled</p>
            </div>

            <p className="text-gray-500 text-xs mt-8">
              You can safely close this window.
            </p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-red-700 mb-3">Unable to Confirm</h1>
            <p className="text-gray-700 text-lg mb-6">
              {errorMessage || "We couldn't process your confirmation."}
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800">
                This link may have expired or already been used.
              </p>
            </div>

            <p className="text-gray-600 text-sm">
              Please contact your representative directly if you need assistance.
            </p>
          </div>
        )}

        {/* Invalid Token State */}
        {status === "invalid" && (
          <div className="text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-amber-600" />
            </div>
            <h1 className="text-3xl font-bold text-amber-700 mb-3">Invalid Link</h1>
            <p className="text-gray-700 text-lg mb-6">
              This confirmation link is not valid.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800">
                The link you clicked appears to be incomplete or corrupted.
              </p>
            </div>

            <p className="text-gray-600 text-sm">
              Please use the link from your original appointment email.
            </p>
          </div>
        )}

        {/* Branding Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Powered by Your CRM • Appointment Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptAppointmentPage;
