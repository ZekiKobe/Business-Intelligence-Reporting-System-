import React, { useState } from "react";
import { Mail, Phone, Building, Calendar, Save, Camera } from "lucide-react";

const ProfilePage: React.FC = () => {
  const [profileData, setProfileData] = useState({
    firstName: "Abebe",
    lastName: "Bekele",
    email: "ababe.bekele@bi.com",
    phone: "+251-9551234567",
    department: "Credit",
    position: "Senior Credit Analyst",
    joinDate: "2020-01-15",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Profile updated:", profileData);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 pb-6 border-b border-portal-stroke">
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border-2 shadow-inner"
            style={{
              background: "linear-gradient(145deg, var(--portal-primary-soft), color-mix(in srgb, var(--portal-accent-soft) 70%, var(--portal-surface)))",
              borderColor: "var(--portal-stroke)",
            }}
          >
            <span className="text-2xl sm:text-3xl font-bold text-portal-text tracking-tight">
              {profileData.firstName.charAt(0)}
              {profileData.lastName.charAt(0)}
            </span>
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 rounded-xl p-2 border border-portal-stroke bg-portal-surface shadow-md hover:shadow-lg transition-shadow"
            aria-label="Change photo"
          >
            <Camera className="w-4 h-4 text-portal-text" />
          </button>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-portal-text tracking-tight">
            {profileData.firstName} {profileData.lastName}
          </h2>
          <p className="text-portal-muted mt-1">{profileData.position}</p>
          <p className="text-sm text-portal-muted mt-0.5">{profileData.department}</p>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="mt-4 px-4 py-2 rounded-xl portal-btn-primary text-sm font-semibold transition-colors"
          >
            {isEditing ? "Cancel" : "Edit profile"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">First name</label>
            {isEditing ? (
              <input
                type="text"
                name="firstName"
                value={profileData.firstName}
                onChange={handleChange}
                className="portal-input"
              />
            ) : (
              <p className="text-portal-text py-2">{profileData.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Last name</label>
            {isEditing ? (
              <input
                type="text"
                name="lastName"
                value={profileData.lastName}
                onChange={handleChange}
                className="portal-input"
              />
            ) : (
              <p className="text-portal-text py-2">{profileData.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-portal-muted shrink-0 hidden sm:block" />
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleChange}
                  className="portal-input flex-1"
                />
              ) : (
                <p className="text-portal-text py-2">{profileData.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Phone</label>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-portal-muted shrink-0 hidden sm:block" />
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleChange}
                  className="portal-input flex-1"
                />
              ) : (
                <p className="text-portal-text py-2">{profileData.phone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Department</label>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-portal-muted shrink-0 hidden sm:block" />
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={profileData.department}
                  onChange={handleChange}
                  className="portal-input flex-1"
                />
              ) : (
                <p className="text-portal-text py-2">{profileData.department}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Position</label>
            {isEditing ? (
              <input
                type="text"
                name="position"
                value={profileData.position}
                onChange={handleChange}
                className="portal-input"
              />
            ) : (
              <p className="text-portal-text py-2">{profileData.position}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-portal-muted mb-1.5">Member since</label>
            <div className="flex items-center gap-2 py-2">
              <Calendar className="w-4 h-4 text-portal-muted shrink-0" />
              <p className="text-portal-text">
                {new Date(profileData.joinDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-5 py-2.5 rounded-xl portal-btn-primary font-semibold text-sm inline-flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save changes
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfilePage;
