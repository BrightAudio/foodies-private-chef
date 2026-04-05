"use client";
import { useState, useEffect } from "react";

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

const CLIENT_STEPS: TutorialStep[] = [
  { title: "Browse Private Chefs", description: "Explore chefs by tier—Sous Chef, Chef, or Master Chef—and find the perfect fit for your event.", icon: "🔍" },
  { title: "Your For You Feed", description: "Discover trending dishes and top-rated specials from private chefs near you.", icon: "✨" },
  { title: "Book an Experience", description: "Choose your date, time, and guest count. Your chef handles everything including groceries.", icon: "📅" },
  { title: "Request Custom Dishes", description: "Chef and Master Chef tiers accept custom dish requests. Submit your idea and approve the grocery list.", icon: "🍽️" },
  { title: "Pay Securely", description: "Payments are held securely until your event is complete. Rate and review your chef after.", icon: "💳" },
];

const CHEF_STEPS: TutorialStep[] = [
  { title: "Complete Your Profile", description: "Add your specialty, cuisine type, rates, and a profile photo to attract clients.", icon: "👨‍🍳" },
  { title: "Post Weekly Specials", description: "Feature your signature dishes with photos and grocery lists. These appear in clients' For You feeds.", icon: "⭐" },
  { title: "Manage Bookings", description: "Accept or decline bookings from your dashboard. Communicate with clients about their events.", icon: "📋" },
  { title: "Handle Custom Requests", description: "Receive custom dish requests, quote grocery costs, and get client approval before shopping.", icon: "🛒" },
  { title: "Get Paid", description: "Payments transfer to your connected Foodies account after each completed event.", icon: "💰" },
];

export default function AppTutorial() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [role, setRole] = useState<"CLIENT" | "CHEF">("CLIENT");

  useEffect(() => {
    const dismissed = localStorage.getItem("tutorial_dismissed");
    if (dismissed) return;

    // Check if user just registered or is new
    const token = localStorage.getItem("token");
    if (!token) {
      // Show to non-logged-in users after brief delay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role === "CHEF") setRole("CHEF"); // eslint-disable-line react-hooks/set-state-in-effect
      // Show if user hasn't seen tutorial yet
      const key = `tutorial_seen_${payload.userId}`;
      if (!localStorage.getItem(key)) {
        setVisible(true);
        localStorage.setItem(key, "1");
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("tutorial_dismissed", "1");
  };

  if (!visible) return null;

  const steps = role === "CHEF" ? CHEF_STEPS : CLIENT_STEPS;
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div className="relative bg-dark-card border border-gold/20 max-w-md w-full overflow-hidden">
        {/* Progress bar */}
        <div className="h-0.5 bg-dark-border">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Skip button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-cream-muted/40 hover:text-cream-muted text-xs tracking-wider uppercase"
          >
            Skip
          </button>

          {/* Step counter */}
          <p className="text-cream-muted/50 text-[10px] tracking-[0.2em] uppercase mb-6">
            Step {currentStep + 1} of {steps.length}
          </p>

          {/* Icon */}
          <div className="text-4xl mb-4">{step.icon}</div>

          {/* Content */}
          <h3 className="text-xl font-bold tracking-tight mb-2">{step.title}</h3>
          <p className="text-cream-muted text-sm leading-relaxed mb-8">{step.description}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="text-cream-muted/50 text-sm hover:text-cream-muted disabled:invisible transition-colors"
            >
              ← Back
            </button>

            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStep ? "bg-gold w-4" : "bg-dark-border hover:bg-cream-muted/30"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <button
                onClick={dismiss}
                className="bg-gold text-dark px-5 py-2 text-sm font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors"
              >
                Get Started
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="text-gold text-sm font-medium hover:text-gold-light transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
