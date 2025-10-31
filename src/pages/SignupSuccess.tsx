import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function SignupSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the clean success page after 1.5 seconds
    const timer = setTimeout(() => {
      window.location.href = "https://bay.digital/success.html";
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <CheckCircle2 className="h-16 w-16 text-green-600 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Success!</h1>
          <p className="text-lg text-gray-600">
            Redirecting to your confirmation page...
          </p>
        </div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}
