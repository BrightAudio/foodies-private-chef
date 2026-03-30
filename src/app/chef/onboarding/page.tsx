"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";

interface Special {
  name: string;
  description: string;
  imageUrl: string;
}

const STEP_LABELS = [
  "Certifications",
  "Background Check",
  "Identity Documents",
  "Chef Profile",
  "Vehicle & Travel",
  "Terms & Submit",
];

const FCRA_DISCLOSURE = `DISCLOSURE REGARDING BACKGROUND INVESTIGATION

In connection with your application to provide services through the Foodies platform, a consumer report and/or investigative consumer report may be obtained from a consumer reporting agency. This report may contain information regarding your character, general reputation, personal characteristics, criminal history, and credit worthiness.

Under the Fair Credit Reporting Act (FCRA), before we can obtain a consumer report about you, we must have your written authorization. You have the right under the FCRA to request a complete and accurate disclosure of the nature and scope of the investigation. You also have the right to request a summary of your rights under the FCRA.

The background investigation may include, but is not limited to:
• Criminal records search (county, state, and federal)
• Sex offender registry check (national)
• Identity verification (SSN trace)
• Address history verification

If any adverse action is taken based on information in the report, you will be notified and provided with a copy of the report and a summary of your rights.`;

const ANTI_POACHING_TEXT = `NON-CIRCUMVENTION AGREEMENT

By accepting these terms, I agree that:

1. I will not solicit, accept, or facilitate any bookings with clients I was introduced to through the Foodies platform outside of the platform.

2. I will not exchange personal contact information (phone numbers, emails, social media) with clients for the purpose of arranging off-platform services.

3. I understand that violation of this agreement may result in:
   - A penalty of $500 or 25% of the circumvented booking value (whichever is greater)
   - Immediate account suspension or permanent ban
   - Legal action to recover damages

4. This obligation continues for 12 months after my last booking through Foodies with any given client.

5. All communication with clients must occur through the Foodies in-app messaging system.`;

export default function ChefOnboarding() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // Step 1: Certifications
    servSafeCertNumber: "",
    servSafeCertExpiry: "",
    generalLiabilityPolicy: "",
    generalLiabilityExpiry: "",
    productLiabilityPolicy: "",
    productLiabilityExpiry: "",
    // Step 2: Background Check
    bgCheckFullName: "",
    bgCheckDOB: "",
    bgCheckSSNLast4: "",
    bgCheckAddress: "",
    bgCheckPreviousAddress: "",
    bgCheckConsent: false,
    fcraConsentSignature: "",
    // Step 3: Identity
    governmentIdType: "DRIVERS_LICENSE",
    // Step 4: Profile
    bio: "",
    specialtyDish: "",
    hourlyRate: "",
    cuisineType: "",
    // Step 5: Vehicle
    vehicleLicensePlate: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColor: "",
    driversLicenseNumber: "",
    willTravelToHomes: true,
    // Step 6: Terms
    termsAccepted: false,
    antiPoachingAccepted: false,
  });

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [governmentIdUrl, setGovernmentIdUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  const [specials, setSpecials] = useState<Special[]>([
    { name: "", description: "", imageUrl: "" },
  ]);

  const addSpecial = () => {
    if (specials.length < 3) {
      setSpecials([...specials, { name: "", description: "", imageUrl: "" }]);
    }
  };

  const updateSpecial = (i: number, field: keyof Special, value: string) => {
    const updated = [...specials];
    updated[i][field] = value;
    setSpecials(updated);
  };

  const removeSpecial = (i: number) => {
    setSpecials(specials.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/register?role=CHEF";
      return;
    }

    const validSpecials = specials.filter((s) => s.name && s.description);

    try {
      const res = await fetch("/api/chefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          profileImageUrl: profileImageUrl || undefined,
          hourlyRate: Number(form.hourlyRate),
          bgCheckConsent: form.bgCheckConsent,
          bgCheckFullName: form.bgCheckFullName || undefined,
          bgCheckDOB: form.bgCheckDOB || undefined,
          bgCheckSSNLast4: form.bgCheckSSNLast4 || undefined,
          bgCheckAddress: form.bgCheckAddress || undefined,
          bgCheckPreviousAddress: form.bgCheckPreviousAddress || undefined,
          fcraConsentSignature: form.fcraConsentSignature || undefined,
          governmentIdUrl: governmentIdUrl || undefined,
          governmentIdType: form.governmentIdType || undefined,
          selfieUrl: selfieUrl || undefined,
          driversLicenseNumber: form.driversLicenseNumber || undefined,
          willTravelToHomes: form.willTravelToHomes,
          termsAccepted: form.termsAccepted,
          antiPoachingAccepted: form.antiPoachingAccepted,
          vehicleLicensePlate: form.vehicleLicensePlate || undefined,
          vehicleMake: form.vehicleMake || undefined,
          vehicleModel: form.vehicleModel || undefined,
          vehicleColor: form.vehicleColor || undefined,
          cuisineType: form.cuisineType || undefined,
          specials: validSpecials.map((s) => ({
            name: s.name,
            description: s.description,
            imageUrl: s.imageUrl || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      user.role = "CHEF";
      localStorage.setItem("user", JSON.stringify(user));

      window.location.href = "/chef/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto pt-28 px-4 pb-16">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Join the Foodies Network</h1>
        <p className="text-cream-muted mb-6">
          Complete all steps to submit your application. This keeps our community safe.
        </p>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex gap-1 mb-3">
            {STEP_LABELS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 transition-colors ${i + 1 <= step ? "bg-gold" : "bg-dark-border"}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] tracking-wider uppercase text-cream-muted/50">
            <span className={step >= 1 ? "text-gold" : ""}>Step {step} of {STEP_LABELS.length}</span>
            <span className={step >= 1 ? "text-cream-muted" : ""}>{STEP_LABELS[step - 1]}</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 px-4 py-3">{error}</p>}

        {/* ========== STEP 1: CERTIFICATIONS ========== */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 1</span>
              <h2 className="text-xl font-bold tracking-tight">Certifications & Insurance</h2>
            </div>
            <p className="text-sm text-cream-muted">
              We require current ServSafe certification and active liability insurance to protect our community.
            </p>

            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-cream-muted">ServSafe Certification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Certificate Number *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.servSafeCertNumber}
                    onChange={(e) => setForm({ ...form, servSafeCertNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Expiration Date *</label>
                  <input
                    type="date"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.servSafeCertExpiry}
                    onChange={(e) => setForm({ ...form, servSafeCertExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-cream-muted">Liability Insurance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">General Liability Policy # *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.generalLiabilityPolicy}
                    onChange={(e) => setForm({ ...form, generalLiabilityPolicy: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">GL Expiry Date *</label>
                  <input
                    type="date"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.generalLiabilityExpiry}
                    onChange={(e) => setForm({ ...form, generalLiabilityExpiry: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Product Liability Policy # *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.productLiabilityPolicy}
                    onChange={(e) => setForm({ ...form, productLiabilityPolicy: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">PL Expiry Date *</label>
                  <input
                    type="date"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.productLiabilityExpiry}
                    onChange={(e) => setForm({ ...form, productLiabilityExpiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (form.servSafeCertNumber && form.servSafeCertExpiry &&
                    form.generalLiabilityPolicy && form.generalLiabilityExpiry &&
                    form.productLiabilityPolicy && form.productLiabilityExpiry) {
                  setError("");
                  setStep(2);
                } else {
                  setError("All certification and insurance fields are required");
                }
              }}
              className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
            >
              Next: Background Check →
            </button>
          </div>
        )}

        {/* ========== STEP 2: BACKGROUND CHECK + FCRA ========== */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 2</span>
              <h2 className="text-xl font-bold tracking-tight">Background Check Authorization</h2>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 px-5 py-4">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                For the safety of our community, all chefs must authorize and pass a background check.
              </p>
            </div>

            {/* Identity Info */}
            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-cream-muted">Personal Information</h3>
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Full Legal Name *</label>
                <input
                  type="text"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  placeholder="Exactly as it appears on your government ID"
                  value={form.bgCheckFullName}
                  onChange={(e) => setForm({ ...form, bgCheckFullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={form.bgCheckDOB}
                    onChange={(e) => setForm({ ...form, bgCheckDOB: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">SSN Last 4 Digits *</label>
                  <input
                    type="text"
                    maxLength={4}
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="••••"
                    value={form.bgCheckSSNLast4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setForm({ ...form, bgCheckSSNLast4: val });
                    }}
                  />
                  <p className="text-[10px] text-cream-muted/40 mt-1">Required for identity verification. Stored securely and never displayed.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Current Address *</label>
                <input
                  type="text"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  placeholder="Full street address, city, state, ZIP"
                  value={form.bgCheckAddress}
                  onChange={(e) => setForm({ ...form, bgCheckAddress: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Previous Address <span className="text-cream-muted/40">(recommended)</span></label>
                <input
                  type="text"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  placeholder="If you've moved in the past 7 years"
                  value={form.bgCheckPreviousAddress}
                  onChange={(e) => setForm({ ...form, bgCheckPreviousAddress: e.target.value })}
                />
              </div>
            </div>

            {/* FCRA Disclosure */}
            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-cream-muted">FCRA Disclosure & Authorization</h3>
              <div className="bg-dark border border-dark-border p-4 max-h-48 overflow-y-auto text-xs text-cream-muted/70 leading-relaxed whitespace-pre-line">
                {FCRA_DISCLOSURE}
              </div>

              <div className="border-t border-dark-border pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 accent-gold w-4 h-4"
                    checked={form.bgCheckConsent}
                    onChange={(e) => setForm({ ...form, bgCheckConsent: e.target.checked })}
                  />
                  <span className="text-sm text-cream leading-relaxed">
                    I have read the FCRA disclosure above and <strong>authorize Foodies</strong> to obtain a consumer report / background investigation about me. I understand this may include criminal history (county, state, federal), sex offender registry checks, and identity verification. <strong className="text-gold">This consent is required to proceed.</strong>
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Digital Signature (type your full legal name) *</label>
                <input
                  type="text"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream italic"
                  placeholder="Type your full legal name to sign"
                  value={form.fcraConsentSignature}
                  onChange={(e) => setForm({ ...form, fcraConsentSignature: e.target.value })}
                />
                <p className="text-[10px] text-cream-muted/40 mt-1">
                  Your typed name constitutes a legally binding electronic signature. Must match the full legal name above.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => setStep(1)} className="text-cream-muted hover:text-cream transition-colors" type="button">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!form.bgCheckFullName || !form.bgCheckDOB || form.bgCheckSSNLast4.length !== 4 || !form.bgCheckAddress) {
                    setError("Full name, date of birth, SSN last 4, and current address are required");
                    return;
                  }
                  if (!form.bgCheckConsent) {
                    setError("You must authorize the background check to continue");
                    return;
                  }
                  if (!form.fcraConsentSignature) {
                    setError("Please sign by typing your full legal name");
                    return;
                  }
                  if (form.fcraConsentSignature.toLowerCase().trim() !== form.bgCheckFullName.toLowerCase().trim()) {
                    setError("Your digital signature must match your full legal name");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Next: Identity Documents →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 3: IDENTITY DOCUMENTS ========== */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 3</span>
              <h2 className="text-xl font-bold tracking-tight">Identity Verification</h2>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 px-5 py-4">
              <p className="text-sm text-blue-300 flex items-center gap-2">
                <span className="text-lg">📷</span>
                Upload a clear photo of your government-issued ID and a selfie for identity matching.
              </p>
            </div>

            <div className="bg-dark-card border border-dark-border p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">ID Type *</label>
                <select
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  value={form.governmentIdType}
                  onChange={(e) => setForm({ ...form, governmentIdType: e.target.value })}
                >
                  <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                  <option value="STATE_ID">State ID</option>
                  <option value="PASSPORT">Passport</option>
                </select>
              </div>

              <div>
                <ImageUpload
                  value={governmentIdUrl}
                  onChange={setGovernmentIdUrl}
                  label="Government-Issued ID Photo *"
                />
                <p className="text-[10px] text-cream-muted/40 mt-2">
                  Upload a clear, well-lit photo of the front of your ID. Ensure all text is readable and no corners are cropped.
                </p>
              </div>

              <div className="border-t border-dark-border pt-5">
                <ImageUpload
                  value={selfieUrl}
                  onChange={setSelfieUrl}
                  label="Selfie Photo *"
                />
                <p className="text-[10px] text-cream-muted/40 mt-2">
                  Take a well-lit selfie showing your full face. This will be compared with your ID photo for verification.
                  Remove hats, sunglasses, and face coverings.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => setStep(2)} className="text-cream-muted hover:text-cream transition-colors" type="button">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!governmentIdUrl) {
                    setError("Please upload a photo of your government-issued ID");
                    return;
                  }
                  if (!selfieUrl) {
                    setError("Please upload a selfie photo for identity matching");
                    return;
                  }
                  setError("");
                  setStep(4);
                }}
                className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Next: Chef Profile →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 4: CHEF PROFILE ========== */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 4</span>
              <h2 className="text-xl font-bold tracking-tight">Chef Profile & Specials</h2>
            </div>

            <ImageUpload
              value={profileImageUrl}
              onChange={setProfileImageUrl}
              label="Profile Photo"
            />

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Bio</label>
              <textarea
                className="w-full border border-dark-border bg-dark px-4 py-3 h-24 text-cream"
                placeholder="Tell clients about your culinary journey..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Specialty Dish *</label>
              <input
                type="text"
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                placeholder="e.g. Pan-Seared Chilean Sea Bass"
                value={form.specialtyDish}
                onChange={(e) => setForm({ ...form, specialtyDish: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Cuisine Type *</label>
              <input
                type="text"
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                placeholder="e.g. Italian, French, Asian Fusion"
                value={form.cuisineType}
                onChange={(e) => setForm({ ...form, cuisineType: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Hourly Rate ($) *</label>
              <input
                type="number"
                className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              />
              <p className="text-xs text-cream-muted/50 mt-1">
                🔪 New chefs start as <span className="text-blue-400">Sous Chef</span> (max $60/hr). Complete 15+ jobs with 4.0+ rating to unlock <span className="text-gold">Chef</span> ($125/hr), then 50+ jobs with 4.5+ for <span className="text-purple-400">Master Chef</span> (no cap).
              </p>
              <p className="text-xs text-cream-muted/50 mt-1">
                Note: Foodies takes a 30% platform fee on each transaction.
              </p>
            </div>

            {/* Specials */}
            <div className="border-t border-dark-border pt-5 mt-5">
              <h3 className="text-lg font-semibold mb-3">Chef Specials (up to 3)</h3>
              <p className="text-sm text-cream-muted mb-4">
                Showcase your signature dishes. Clients browse these when booking.
              </p>

              {specials.map((special, i) => (
                <div key={i} className="bg-dark-card border border-dark-border p-5 space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">Special #{i + 1}</h4>
                    {specials.length > 1 && (
                      <button onClick={() => removeSpecial(i)} className="text-red-400 text-xs" type="button">Remove</button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Dish name"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    value={special.name}
                    onChange={(e) => updateSpecial(i, "name", e.target.value)}
                  />
                  <textarea
                    placeholder="Description"
                    className="w-full border border-dark-border bg-dark px-4 py-3 h-16 text-cream"
                    value={special.description}
                    onChange={(e) => updateSpecial(i, "description", e.target.value)}
                  />
                  <ImageUpload
                    value={special.imageUrl}
                    onChange={(url) => updateSpecial(i, "imageUrl", url)}
                    label="Dish Photo (optional)"
                  />
                </div>
              ))}

              {specials.length < 3 && (
                <button type="button" onClick={addSpecial} className="text-gold font-medium hover:text-gold-light transition-colors text-sm">
                  + Add Another Special
                </button>
              )}
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => setStep(3)} className="text-cream-muted hover:text-cream transition-colors" type="button">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (form.specialtyDish && form.hourlyRate && form.cuisineType) {
                    setError("");
                    setStep(5);
                  } else {
                    setError("Specialty dish, cuisine type, and hourly rate are required");
                  }
                }}
                className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Next: Vehicle Info →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 5: VEHICLE & TRAVEL ========== */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 5</span>
              <h2 className="text-xl font-bold tracking-tight">Vehicle & Travel Information</h2>
            </div>
            <p className="text-sm text-cream-muted">
              For client safety, we collect vehicle details so clients know who is arriving at their home.
            </p>

            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">License Plate *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="ABC 1234"
                    value={form.vehicleLicensePlate}
                    onChange={(e) => setForm({ ...form, vehicleLicensePlate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Vehicle Color *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="e.g. Silver"
                    value={form.vehicleColor}
                    onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Vehicle Make *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="e.g. Toyota"
                    value={form.vehicleMake}
                    onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Vehicle Model *</label>
                  <input
                    type="text"
                    className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                    placeholder="e.g. Camry"
                    value={form.vehicleModel}
                    onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">Driver&apos;s License Number <span className="text-cream-muted/40">(optional)</span></label>
                <input
                  type="text"
                  className="w-full border border-dark-border bg-dark px-4 py-3 text-cream"
                  placeholder="For additional identity verification"
                  value={form.driversLicenseNumber}
                  onChange={(e) => setForm({ ...form, driversLicenseNumber: e.target.value })}
                />
              </div>

              <div className="border-t border-dark-border pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-gold w-4 h-4"
                    checked={form.willTravelToHomes}
                    onChange={(e) => setForm({ ...form, willTravelToHomes: e.target.checked })}
                  />
                  <span className="text-sm text-cream">I will travel to client homes to cook</span>
                </label>
                <p className="text-[10px] text-cream-muted/40 mt-1 ml-7">
                  Most Foodies bookings require traveling to the client&apos;s location.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => setStep(4)} className="text-cream-muted hover:text-cream transition-colors" type="button">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (form.vehicleLicensePlate && form.vehicleMake && form.vehicleModel && form.vehicleColor) {
                    setError("");
                    setStep(6);
                  } else {
                    setError("All vehicle fields are required");
                  }
                }}
                className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors"
              >
                Next: Terms & Submit →
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 6: TERMS & SUBMIT ========== */}
        {step === 6 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 tracking-wider">STEP 6</span>
              <h2 className="text-xl font-bold tracking-tight">Terms Agreement & Submit</h2>
            </div>

            {/* Terms of Service */}
            <div className="bg-dark-card border border-dark-border p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-cream-muted">Terms of Service</h3>
              <div className="bg-dark border border-dark-border p-4 max-h-40 overflow-y-auto text-xs text-cream-muted/70 leading-relaxed">
                <p className="mb-2">By joining the Foodies platform as a chef, you agree to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Maintain valid ServSafe certification and liability insurance at all times</li>
                  <li>Comply with all local health codes and food safety regulations</li>
                  <li>Arrive on time for all confirmed bookings</li>
                  <li>Maintain professional conduct with all clients</li>
                  <li>Accept a 30% platform fee on all bookings</li>
                  <li>Use only the Foodies in-app messaging system for client communication</li>
                  <li>Submit to background checks and identity verification</li>
                  <li>Keep your vehicle information current and accurate</li>
                </ul>
                <p className="mt-3">
                  Full terms available at <a href="/terms" className="text-gold underline" target="_blank">foodies.com/terms</a>.
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-gold w-4 h-4"
                  checked={form.termsAccepted}
                  onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                />
                <span className="text-sm text-cream">
                  I have read and agree to the <strong className="text-gold">Foodies Terms of Service</strong>.
                </span>
              </label>
            </div>

            {/* Anti-Poaching Agreement */}
            <div className="bg-dark-card border border-gold/20 p-6 space-y-4">
              <h3 className="text-sm font-bold tracking-wider uppercase text-gold">Non-Circumvention Agreement</h3>
              <div className="bg-dark border border-dark-border p-4 max-h-48 overflow-y-auto text-xs text-cream-muted/70 leading-relaxed whitespace-pre-line">
                {ANTI_POACHING_TEXT}
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-gold w-4 h-4"
                  checked={form.antiPoachingAccepted}
                  onChange={(e) => setForm({ ...form, antiPoachingAccepted: e.target.checked })}
                />
                <span className="text-sm text-cream">
                  I have read and agree to the <strong className="text-gold">Non-Circumvention Agreement</strong>. I understand that violating these terms may result in penalties, suspension, or legal action.
                </span>
              </label>
            </div>

            {/* Summary */}
            <div className="bg-dark-card border border-emerald-500/20 p-6">
              <h3 className="text-sm font-bold tracking-wider uppercase text-emerald-400 mb-3">Application Summary</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="text-cream-muted/60">Name:</div>
                <div>{form.bgCheckFullName}</div>
                <div className="text-cream-muted/60">Cuisine:</div>
                <div>{form.cuisineType}</div>
                <div className="text-cream-muted/60">Specialty:</div>
                <div>{form.specialtyDish}</div>
                <div className="text-cream-muted/60">Rate:</div>
                <div className="text-gold">${form.hourlyRate}/hr</div>
                <div className="text-cream-muted/60">Vehicle:</div>
                <div>{form.vehicleColor} {form.vehicleMake} {form.vehicleModel}</div>
                <div className="text-cream-muted/60">BG Check:</div>
                <div className="text-emerald-400">Authorized ✓</div>
                <div className="text-cream-muted/60">ID Uploaded:</div>
                <div className="text-emerald-400">{governmentIdUrl ? "Yes ✓" : "No"}</div>
                <div className="text-cream-muted/60">Selfie:</div>
                <div className="text-emerald-400">{selfieUrl ? "Yes ✓" : "No"}</div>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 px-5 py-4">
              <p className="text-sm text-amber-300">
                ⏳ After submitting, your application will go through verification. You <strong>cannot accept bookings</strong> until your background check clears and your account is approved.
              </p>
            </div>

            <div className="flex gap-4 items-center">
              <button onClick={() => setStep(5)} className="text-cream-muted hover:text-cream transition-colors" type="button">
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!form.termsAccepted) {
                    setError("You must accept the Terms of Service");
                    return;
                  }
                  if (!form.antiPoachingAccepted) {
                    setError("You must accept the Non-Circumvention Agreement");
                    return;
                  }
                  setError("");
                  handleSubmit();
                }}
                disabled={loading}
                className="bg-gold text-dark px-8 py-3 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
              >
                {loading ? "Submitting Application..." : "Submit Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
