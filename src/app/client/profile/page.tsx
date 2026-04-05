"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { usePageTitle } from "@/hooks/usePageTitle";
import { compressImage } from "@/lib/compressImage";

const CUISINE_OPTIONS = [
  "Italian", "Japanese", "Mexican", "Indian", "French", "Mediterranean",
  "Chinese", "Korean", "Thai", "Middle Eastern", "Southern / BBQ",
  "West African", "Caribbean", "Peruvian", "Moroccan", "Scandinavian",
  "Modern American", "Vietnamese", "Ethiopian", "Greek",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Pescatarian", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Halal", "Kosher", "Low-Sodium",
];

const ALLERGY_OPTIONS = [
  "Peanuts", "Tree Nuts", "Shellfish", "Fish", "Eggs", "Milk/Dairy",
  "Wheat", "Soy", "Sesame",
];

export default function ClientProfilePage() {
  usePageTitle("My Profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/login?redirect=/client/profile"; return; }

    fetch("/api/client/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserName(data.user.name);
        if (data.profile) {
          setBio(data.profile.bio || "");
          setProfileImageUrl(data.profile.profileImageUrl || "");
          setFavoriteCuisines(data.profile.favoriteCuisines || []);
          setDietaryRestrictions(data.profile.dietaryRestrictions || []);
          setAllergies(data.profile.allergies || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProfileImageUrl(data.url);
      }
    } catch { /* ignore */ }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/client/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio, profileImageUrl, favoriteCuisines, dietaryRestrictions, allergies }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) return <><Navbar /><div className="text-center py-32 text-cream-muted pt-28">Loading...</div></>;

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Profile</h1>
        <p className="text-cream-muted text-sm mb-10">Tell us what you love — we&apos;ll personalize your experience.</p>

        {/* Name */}
        <div className="bg-dark-card border border-dark-border p-6 mb-6">
          <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-1">Name</p>
          <p className="text-lg font-semibold">{userName}</p>
        </div>

        {/* Profile Photo */}
        <div className="bg-dark-card border border-dark-border p-6 mb-6">
          <p className="text-xs font-medium tracking-wider uppercase text-cream-muted mb-3">Profile Photo</p>
          <div className="flex items-center gap-5">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt="Profile"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-gold/30"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-dark border-2 border-dark-border flex items-center justify-center text-cream-muted text-2xl">
                {userName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div>
              <label className="cursor-pointer inline-block bg-dark border border-gold/30 text-gold px-4 py-2 text-sm font-medium hover:bg-gold/10 transition-colors">
                {uploadingPhoto ? "Uploading..." : "Choose Photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
              <p className="text-xs text-cream-muted mt-1">JPG, PNG, or WebP. Max 5 MB.</p>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-2">About You</label>
          <textarea
            className="w-full border border-dark-border bg-dark-card px-4 py-3 h-24 text-cream text-sm"
            placeholder="Food lover, dinner party host, adventurous eater..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Favorite Cuisines */}
        <div className="mb-8">
          <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-3">
            Favorite Cuisines <span className="text-cream-muted/40">— select all that appeal to you</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => {
              const selected = favoriteCuisines.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleItem(favoriteCuisines, setFavoriteCuisines, c)}
                  className={`px-4 py-2 border text-sm font-medium transition-all ${
                    selected
                      ? "bg-gold text-dark border-gold"
                      : "bg-transparent text-cream border-dark-border hover:border-gold/40"
                  }`}
                >
                  {c} {selected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-8">
          <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-3">
            Dietary Preferences <span className="text-cream-muted/40">— optional</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => {
              const selected = dietaryRestrictions.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleItem(dietaryRestrictions, setDietaryRestrictions, d)}
                  className={`px-4 py-2 border text-sm font-medium transition-all ${
                    selected
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-transparent text-cream border-dark-border hover:border-emerald-500/40"
                  }`}
                >
                  {d} {selected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allergies */}
        <div className="mb-10">
          <label className="block text-xs font-medium tracking-wider uppercase text-cream-muted mb-3">
            Allergies <span className="text-cream-muted/40">— optional</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((a) => {
              const selected = allergies.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleItem(allergies, setAllergies, a)}
                  className={`px-4 py-2 border text-sm font-medium transition-all ${
                    selected
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-transparent text-cream border-dark-border hover:border-red-500/40"
                  }`}
                >
                  {a} {selected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </div>
    </>
  );
}
