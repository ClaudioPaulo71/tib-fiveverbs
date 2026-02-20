import React, { useState, useEffect } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import api from '../services/api';

const OnboardingForm = ({ onComplete }) => {
    const { getAccessTokenSilently } = useAuth0();
    const [topics, setTopics] = useState([]);
    const [formData, setFormData] = useState({
        native_language: 'Portuguese',
        proficiency_level: 'beginner',
        interests: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const token = await getAccessTokenSilently();
                const response = await api.get('/topics/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTopics(response.data);
            } catch (error) {
                console.error("Error fetching topics:", error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [getAccessTokenSilently]);

    const handleInterestToggle = (topicName) => {
        setFormData(prev => {
            const interests = prev.interests.includes(topicName)
                ? prev.interests.filter(i => i !== topicName)
                : [...prev.interests, topicName];
            return { ...prev, interests };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = await getAccessTokenSilently();
            await api.patch('/profile/', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (onComplete) onComplete();
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile.");
        }
    };

    if (loading) return <div>Loading topics...</div>;

    return (
        <div className="onboarding-container">
            <h2>Welcome! Let's personalize your experience.</h2>
            <form onSubmit={handleSubmit}>

                <div className="form-group">
                    <label>Native Language</label>
                    <select
                        value={formData.native_language}
                        onChange={e => setFormData({ ...formData, native_language: e.target.value })}
                    >
                        <option value="Portuguese">Portuguese</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Italian">Italian</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>English Proficiency</label>
                    <select
                        value={formData.proficiency_level}
                        onChange={e => setFormData({ ...formData, proficiency_level: e.target.value })}
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Interests (Select at least 3)</label>
                    <div className="topics-grid">
                        {topics.map(topic => (
                            <div
                                key={topic.id}
                                className={`topic-card ${formData.interests.includes(topic.name) ? 'selected' : ''}`}
                                onClick={() => handleInterestToggle(topic.name)}
                            >
                                {topic.name}
                            </div>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={formData.interests.length < 1}>
                    Start Learning
                </button>
            </form>
        </div>
    );
};

export default OnboardingForm;
