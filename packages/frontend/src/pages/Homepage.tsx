import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe } from '@stripe/react-stripe-js'; // FIX: Removed CardElement and useElements

// --- Configuration ---
const stripePromise = loadStripe('pk_live_51RYARPAeKEHgYvaK8U4qZKbljuZ2BdVWgOq9b7CmCiOoa8YhQSniWou8ku27PLqVbggGf7oCdybEQ4dsHlhgq2to003sE5YYWK');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// --- Helper Functions ---
const getUserId = (): string => {
    let userId = localStorage.getItem('nighthub_userId');
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem('nighthub_userId', userId);
    }
    return userId;
};

// --- Stripe Payment Form Component (Simplified) ---
const PaymentForm = () => {
    const stripe = useStripe();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleSubscribeClick = async () => {
        if (!stripe) return;

        setProcessing(true);
        const userId = getUserId();
        try {
            const res = await fetch(`${API_URL}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url; // Redirect to Stripe Checkout page
            } else {
                throw new Error(data.error || "Failed to create checkout session.");
            }
        } catch (err) {
            setError((err as Error).message);
            setProcessing(false);
        }
    };

    return (
        <div>
            <ul className="text-left space-y-2 mb-8">
                <li className="flex items-center"><svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Fully anonymous adult chat</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Help support the platform</li>
                <li className="flex items-center"><svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Cancel your subscription anytime</li>
            </ul>
            {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}
            <button
                onClick={handleSubscribeClick}
                disabled={processing || !stripe}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg disabled:opacity-50"
            >
                {processing ? "Redirecting..." : "Subscribe for $2.99/month"}
            </button>
        </div>
    );
};


// --- Homepage Component ---
const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [showTosModal, setShowTosModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('nighthub_tos_agreed') !== 'true') {
        setShowTosModal(true);
    }
    const checkStatus = async () => {
        const userId = getUserId();
        try {
            const res = await fetch(`${API_URL}/check-subscription-status/${userId}`);
            const data = await res.json();
            setIsSubscribed(data.isSubscribed);
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('subscribed') === 'true') {
                navigate('/subscribe-success');
            }
        } catch (error) {
            console.error("Failed to check subscription status:", error);
        } finally {
            setIsLoading(false);
        }
    };
    checkStatus();
  }, [navigate]);

  const handleAgreeToTos = () => {
    localStorage.setItem('nighthub_tos_agreed', 'true');
    setShowTosModal(false);
  };

  const handleNsfwClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (isSubscribed) {
        navigate('/waiting?mode=nsfw');
    } else {
        setShowPaymentModal(true);
    }
  };
  
  const manageSubscription = async () => {
      setIsLoading(true);
      const userId = getUserId();
      try {
          const res = await fetch(`${API_URL}/customer-portal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
          });
          const data = await res.json();
          if (data.url) {
              window.location.href = data.url;
          }
      } catch (error) {
          console.error("Could not create portal session:", error);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen font-sans overflow-hidden">
        {/* ToS Modal */}
        {showTosModal && (
            <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 md:p-8 max-w-2xl w-full text-center">
                    <h1 className="text-3xl font-bold mb-4">Welcome to Nighthub!</h1>
                    <p className="text-gray-400 mb-6">Before you connect, please read and agree to our terms.</p>
                    <div className="text-left bg-gray-900 p-4 rounded-md space-y-3">
                        <p>• You must be <strong>13+</strong> for Safe Mode and <strong>18+</strong> for NSFW Mode.</p>
                        <p>• Be respectful. Hate speech, harassment, and illegal activities are strictly forbidden.</p>
                        <p>• Severe violations will be reported to law enforcement. Your anonymity is not absolute.</p>
                    </div>
                    <button
                    onClick={handleAgreeToTos}
                    className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg"
                    >
                    I Understand and Agree
                    </button>
                    <div className="mt-4 text-xs text-gray-500">
                        <p>By clicking Agree, you accept our full</p>
                        <Link to="/terms" target="_blank" className="underline hover:text-white">Terms of Service</Link>
                        <span className="mx-1">&</span>
                        <Link to="/privacy" target="_blank" className="underline hover:text-white">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        )}
      
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 text-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold text-red-400 mb-4 text-center">Access NSFW Mode</h2>
            <p className="text-center text-gray-300 mb-6">You will be redirected to our secure payment processor, Stripe, to complete your subscription.</p>
            <Elements stripe={stripePromise}>
                <PaymentForm />
            </Elements>
            <button onClick={() => setShowPaymentModal(false)} className="w-full mt-4 text-gray-400 hover:text-white transition-colors">
              Maybe later
            </button>
          </div>
        </div>
      )}
      
      {/* Account management button */}
      <div className="absolute top-4 right-4 z-20">
          {isSubscribed && (
              <button onClick={manageSubscription} className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                  Manage Subscription
              </button>
          )}
      </div>

      <Link to="/waiting?mode=safe" className="group relative flex-1 flex items-center justify-center bg-gray-900 text-white cursor-pointer">
        <div className="text-center z-10 p-4">
          <h2 className="text-5xl md:text-7xl font-black uppercase text-green-400">Safe Mode</h2>
        </div>
      </Link>
      <div className="hidden md:block w-0.5 bg-gray-700"></div>
      <a href="/waiting?mode=nsfw" onClick={handleNsfwClick} className={`group relative flex-1 flex items-center justify-center bg-black text-white cursor-pointer ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-center z-10 p-4">
          <h2 className="text-5xl md:text-7xl font-black uppercase text-red-500">NSFW Mode</h2>
          {!isSubscribed && <p className="mt-2 bg-red-500/80 px-3 py-1 rounded-full text-sm font-bold">Subscribe to Unlock</p>}
        </div>
      </a>
    </div>
  );
};

export default Homepage;
