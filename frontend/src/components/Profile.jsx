import React, { useState } from "react";
import api from '../services/api';

const Profile = ({ profile, onUpdate, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        phone: profile?.phone || '',
        location: profile?.location || '',
        avatar_url: profile?.avatar_url || '',
        native_language: profile?.native_language || 'Portuguese',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.patch('/profile/', formData);
            onUpdate(res.data);
            setIsEditing(false);
            alert("Profile updated successfully! ✨");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-overlay fade-in" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>My Profile</h3>
                    <button onClick={onClose} className="btn-icon">✕</button>
                </div>

                <div className="profile-content">
                    <div className="profile-avatar-section">
                        <img
                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}&background=random`}
                            alt="Avatar"
                            className="profile-large-avatar"
                        />
                        <h4>{profile?.username}</h4>
                        <p className="profile-email">{profile?.email}</p>
                    </div>

                    {!isEditing ? (
                        <div className="profile-details">
                            <div className="info-item">
                                <label>Phone</label>
                                <span>{profile?.phone || 'Not set'}</span>
                            </div>
                            <div className="info-item">
                                <label>Location</label>
                                <span>{profile?.location || 'Not set'}</span>
                            </div>
                            <div className="info-item">
                                <label>Language</label>
                                <span>{profile?.native_language}</span>
                            </div>
                            <div className="info-item">
                                <label>Streak</label>
                                <span>{profile?.streak_days} days 🔥</span>
                            </div>
                            <div className="info-item">
                                <label>Total XP</label>
                                <span>{profile?.xp_points} pts</span>
                            </div>
                            <button className="primary" onClick={() => setIsEditing(true)} style={{ marginTop: '20px' }}>
                                Edit Profile
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="profile-form">
                            <div className="form-group">
                                <label>Avatar URL</label>
                                <input
                                    type="url"
                                    name="avatar_url"
                                    value={formData.avatar_url}
                                    onChange={handleChange}
                                    placeholder="https://example.com/photo.jpg"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+55 ..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="City, Country"
                                />
                            </div>
                            <div className="form-buttons">
                                <button type="button" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</button>
                                <button type="submit" className="primary" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
