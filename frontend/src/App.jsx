import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LoginButton from './components/LoginButton'
import LogoutButton from './components/LogoutButton'
import Profile from './components/Profile'
import OnboardingForm from './components/OnboardingForm'
import LessonCard from './components/LessonCard'
import CalendarView from './components/CalendarView'
import { useAuth0 } from "@auth0/auth0-react";
import api from './services/api';

function App() {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [userProfile, setUserProfile] = useState(null);
  const [todayLesson, setTodayLesson] = useState(null);
  const [appLoading, setAppLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardScores, setCardScores] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [joinDate, setJoinDate] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [dailyAnswers, setDailyAnswers] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        setAppLoading(true);
        try {
          const token = await getAccessTokenSilently();
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          const profileRes = await api.get('/profile/');
          setUserProfile(profileRes.data);

          // Fetch History for Calendar
          const historyRes = await api.get('/lessons/history/');
          setHistory(historyRes.data.lessons);
          setJoinDate(historyRes.data.join_date);

          if (profileRes.data.interests && profileRes.data.interests.length > 0) {
            fetchLessonForDate(new Date());
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setAppLoading(false);
        }
      }
    };
    fetchData();
  }, [isAuthenticated, getAccessTokenSilently]);

  const fetchLessonForDate = async (date) => {
    setIsProcessing(true);

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const res = await api.get(`/lessons/today/?date=${dateStr}`);

      // Update state only after successful fetch to avoid blank state during quick clicks
      const userData = res.data.user_data || {};
      setDailyAnswers(userData);

      // Calculate initial scores for each content card from saved user_data
      const initialScores = {};
      if (res.data.contents) {
        res.data.contents.forEach(content => {
          const savedForCard = userData[content.id];
          if (savedForCard) {
            let score = 0;
            const quiz = savedForCard.quiz || {};
            const gap = savedForCard.gap || "";

            // Re-run the same scoring logic as LessonCard
            (content.quiz_questions || []).forEach((q, idx) => {
              if (q && quiz[idx] === q.answer) score += 1;
            });
            const normalizedInput = gap.toLowerCase().trim();
            const normalizedAnswer = String(content.fill_gap_exercise?.answer || "").toLowerCase().trim();
            if (normalizedInput === normalizedAnswer && normalizedAnswer !== "") score += 1;

            initialScores[content.id] = score;
          }
        });
      }
      setCardScores(initialScores);
      setTodayLesson(res.data);

      // Update history
      if (!history || !history.find(h => h.date === dateStr)) {
        const historyRes = await api.get('/lessons/history/');
        setHistory(historyRes.data.lessons);
      }
    } catch (e) {
      console.error("Error fetching lesson:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    fetchLessonForDate(date);
  };

  const handleOnboardingComplete = () => {
    setAppLoading(true);
    const fetchData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const profileRes = await api.get('/profile/');
        setUserProfile(profileRes.data);

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const lessonRes = await api.get(`/lessons/today/?date=${dateStr}`);
        setTodayLesson(lessonRes.data);
        setDailyAnswers(lessonRes.data.user_data || {});
        setCardScores({}); // Ensure fresh scores
      } catch (e) {
        console.error(e);
      } finally {
        setAppLoading(false);
      }
    };
    fetchData();
  };

  const handleScoreChange = (contentId, score) => {
    // BLOCK: Ignore updates if we are in the middle of a transition/load
    if (!todayLesson || isProcessing) return;
    setCardScores(prev => ({ ...prev, [contentId]: score }));
  };

  const handleAnswersChange = (contentId, answers) => {
    // BLOCK: Ignore updates if we are in the middle of a transition/load
    if (!todayLesson || isProcessing) return;
    setDailyAnswers(prev => ({ ...prev, [contentId]: answers }));
  };

  const totalDailyScore = Object.values(cardScores).reduce((acc, score) => acc + (score || 0), 0);

  // Auto-save progress with SAFETY LOCK
  useEffect(() => {
    if (!todayLesson || todayLesson.completed || isProcessing) return;

    if (Object.keys(dailyAnswers).length === 0 && totalDailyScore === 0) return;

    const currentLessonId = todayLesson.id;

    const timer = setTimeout(() => {
      const autoSave = async () => {
        try {
          // LOCK: Ensure we are still on the same lesson
          if (todayLesson.id !== currentLessonId) return;

          setIsSaving(true);
          await api.patch(`/lessons/${currentLessonId}/`, {
            score: totalDailyScore,
            user_data: dailyAnswers
          });
          // Brief delay to show the "Saved" state if we wanted, but let's just clear it
          setTimeout(() => setIsSaving(false), 1000);
        } catch (e) {
          console.error("Auto-save failed:", e);
          setIsSaving(false);
        }
      };
      autoSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [dailyAnswers, totalDailyScore, todayLesson?.id, todayLesson?.completed, todayLesson?.date, isProcessing]);

  const handleFinishLesson = async () => {
    if (!todayLesson) return;
    setAppLoading(true);
    try {
      setIsSaving(true);
      await api.patch(`/lessons/${todayLesson.id}/`, {
        score: totalDailyScore,
        completed: true,
        user_data: dailyAnswers // Persist answers!
      });

      // Refresh user profile and history
      const profileRes = await api.get('/profile/');
      setUserProfile(profileRes.data);
      const historyRes = await api.get('/lessons/history/');
      setHistory(historyRes.data.lessons);

      // Refresh current lesson state
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const lessonRes = await api.get(`/lessons/today/?date=${dateStr}`);
      setTodayLesson(lessonRes.data);
      setDailyAnswers(lessonRes.data.user_data || {});

      // Success feedback without blocking alert
      console.log("Lesson saved successfully! ✨");
    } catch (e) {
      console.error("Error saving lesson:", e);
      alert("Failed to save lesson progress.");
    } finally {
      setAppLoading(false);
    }
  };

  const userName = user?.name?.split(' ')[0] || "User";

  return (
    <>
      <div className="header">
        <h1>
          <img src="/src/assets/logo.png" alt="VER5S Logo" className="logo-img" />
          VER5S
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isSaving && (
            <div className="saving-indicator fade-in">
              <span className="spinner-mini"></span>
              <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>Saving progress...</span>
            </div>
          )}
          {isAuthenticated && (
            <div className="profile-link" onClick={() => setShowProfile(true)}>
              <img
                src={userProfile?.avatar_url || user?.picture || `https://ui-avatars.com/api/?name=${user?.name}&background=random`}
                alt="User"
                className="header-avatar"
              />
              <span style={{ color: 'white', fontWeight: '600' }}>{userName}</span>
            </div>
          )}
          {isAuthenticated && <LogoutButton />}
        </div>
      </div>

      <div className="container">
        {isLoading || appLoading ? (
          <div className="loading-screen-compact">
            <div className="spinner"></div>
            <p>Loading your personalized lesson...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="card">
            <p>Welcome to your personalized English learning journey.</p>
            <LoginButton />
          </div>
        ) : (
          <>
            {!userProfile ? (
              <div className="loading-screen-compact">
                <div className="spinner"></div>
                <p>Configuring profile...</p>
              </div>
            ) : userProfile.interests?.length === 0 ? (
              <OnboardingForm onComplete={handleOnboardingComplete} />
            ) : (
              <div className="dashboard">
                <div className="dashboard-header" style={{ marginBottom: '30px' }}>
                  <h2>Welcome back, {userName}</h2>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-label">Daily Score</span>
                      <span className="stat-value">{totalDailyScore} pts</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Level</span>
                      <span className="stat-value">{userProfile?.proficiency_level}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Streak</span>
                      <span className="stat-value">{userProfile?.streak_days} days 🔥</span>
                    </div>
                  </div>
                </div>

                <div className="main-content-layout">
                  <div className="calendar-sidebar">
                    <h3>Your Progress</h3>
                    <CalendarView
                      onDateSelect={handleDateSelect}
                      history={history}
                      userLevel={userProfile?.proficiency_level}
                      minDate={joinDate}
                    />
                  </div>

                  <div className="lesson-area">
                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
                      Lessons for {selectedDate.toLocaleDateString()}
                    </h3>

                    {isProcessing && (
                      <div className="processing-overlay">
                        <div className="spinner"></div>
                        <p>Generating your AI study plan...</p>
                      </div>
                    )}

                    {!isProcessing && todayLesson ? (
                      <div className="lesson-list">
                        {todayLesson.contents?.map(content => (
                          <LessonCard
                            key={content.id}
                            content={content}
                            onScoreChange={handleScoreChange}
                            savedAnswers={dailyAnswers[content.id]}
                            onAnswersChange={handleAnswersChange}
                          />
                        ))}
                        {todayLesson && !todayLesson.completed && (
                          <div style={{ marginTop: '30px', textAlign: 'center' }}>
                            <button
                              className="primary"
                              onClick={handleFinishLesson}
                              style={{ padding: '15px 40px', fontSize: '1.1rem', borderRadius: '12px', background: '#10b981' }}
                            >
                              Finish and Save Lesson ✨
                            </button>
                          </div>
                        )}
                        {todayLesson && todayLesson.completed && (
                          <div style={{
                            marginTop: '30px',
                            padding: '20px',
                            background: '#dcfce7',
                            borderRadius: '12px',
                            textAlign: 'center',
                            color: '#15803d',
                            fontWeight: '600',
                            border: '2px solid #10b981'
                          }}>
                            ✓ Lesson Completed! Well done.
                          </div>
                        )}
                      </div>
                    ) : !isProcessing && (
                      <div className="empty-state">
                        <p>No study plan for this date yet. Click a date to generate one!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showProfile && userProfile && (
        <Profile
          profile={userProfile}
          onUpdate={(updated) => setUserProfile(updated)}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
}

export default App;
