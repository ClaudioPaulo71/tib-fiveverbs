import React, { useState, useEffect } from 'react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

const LessonCard = ({ content, onScoreChange, savedAnswers, onAnswersChange }) => {
    // Basic defensive extraction
    const verb = content?.verb || {};
    const context_sentences = Array.isArray(content?.context_sentences) ? content.context_sentences : [];
    const quiz_questions = Array.isArray(content?.quiz_questions) ? content.quiz_questions : [];
    const fill_gap_exercise = content?.fill_gap_exercise || {};

    const [showDetails, setShowDetails] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState(savedAnswers?.quiz || {});
    const [fillGapAnswer, setFillGapAnswer] = useState(savedAnswers?.gap || '');
    const [showGapResult, setShowGapResult] = useState(null);
    const [cardScore, setCardScore] = useState(0);

    // Sync from props if savedAnswers change (e.g. on mount/load/date switch)
    useEffect(() => {
        setQuizAnswers(savedAnswers?.quiz || {});
        setFillGapAnswer(savedAnswers?.gap || '');
        // Do NOT clear showGapResult here, as it clears the "Correct!" message 
        // immediately when it bubbles to the parent and triggers a prop change.
    }, [savedAnswers, content?.id]);

    const calculateCurrentScore = (tempQuiz = quizAnswers, tempGap = fillGapAnswer) => {
        let score = 0;
        quiz_questions.forEach((question, index) => {
            if (question && tempQuiz[index] === question.answer) {
                score += 1;
            }
        });

        const normalizedInput = tempGap.toLowerCase().trim();
        const normalizedAnswer = String(fill_gap_exercise?.answer || '').toLowerCase().trim();
        if (normalizedInput === normalizedAnswer && normalizedAnswer !== '') {
            score += 1;
        }
        return score;
    };

    // Keep local cardScore in sync for UI purposes
    useEffect(() => {
        setCardScore(calculateCurrentScore());
    }, [quizAnswers, fillGapAnswer, quiz_questions, fill_gap_exercise]);

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    const handleQuizAnswer = (qIndex, option) => {
        if (quizAnswers[qIndex]) return;
        const newQuiz = { ...quizAnswers, [qIndex]: option };
        setQuizAnswers(newQuiz);

        // BUBBLE IMMEDIATELY ON INTERACTION
        if (onAnswersChange && content?.id) {
            onAnswersChange(content.id, { quiz: newQuiz, gap: fillGapAnswer });
        }
        if (onScoreChange && content?.id) {
            onScoreChange(content.id, calculateCurrentScore(newQuiz, fillGapAnswer));
        }
    };

    const checkGapAnswer = () => {
        const answer = fill_gap_exercise?.answer;
        if (!fillGapAnswer.trim() || !answer) return;

        const normalizedInput = fillGapAnswer.toLowerCase().trim();
        const normalizedAnswer = String(answer).toLowerCase().trim();

        if (normalizedInput === normalizedAnswer) {
            setShowGapResult('Correct! ✨');
        } else {
            setShowGapResult('Try again. 🤔');
        }

        // BUBBLE IMMEDIATELY ON INTERACTION
        if (onAnswersChange && content?.id) {
            onAnswersChange(content.id, { quiz: quizAnswers, gap: fillGapAnswer });
        }
        if (onScoreChange && content?.id) {
            onScoreChange(content.id, calculateCurrentScore(quizAnswers, fillGapAnswer));
        }
    };

    const handleGapChange = (val) => {
        setFillGapAnswer(val);
        if (showGapResult) setShowGapResult(null);

        // BUBBLE IMMEDIATELY ON TYPING
        if (onAnswersChange && content?.id) {
            onAnswersChange(content.id, { quiz: quizAnswers, gap: val });
        }
        // ALSO BUBBLE SCORE SO IT REFLECTS IN THE HEADER IMMEDIATELY
        if (onScoreChange && content?.id) {
            onScoreChange(content.id, calculateCurrentScore(quizAnswers, val));
        }
    };

    const rawWord = verb?.word || '';
    const displayWord = rawWord.toLowerCase().startsWith('to ')
        ? rawWord.toLowerCase()
        : `to ${rawWord.toLowerCase()}`;

    const sentenceLabels = ['Affirmative', 'Negative', 'Interrogative'];

    const exportToPDF = async () => {
        const doc = new jsPDF();
        const contentId = `pdf-content-${content.id}`;
        const element = document.getElementById(contentId);

        if (!element) return;

        // Ensure element is visible during capture
        const wasHidden = !showDetails;
        if (wasHidden) setShowDetails(true);

        // Wait for state update if it was hidden
        setTimeout(async () => {
            try {
                // FORCE BLACK TEXT FOR EXPORT
                element.classList.add('pdf-export-mode');

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                element.classList.remove('pdf-export-mode');
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 20;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                doc.setFontSize(22);
                doc.setTextColor(30, 41, 59); // Slate-800
                doc.text(`Five Verbs Study Plan: ${displayWord}`, 10, 15);

                doc.addImage(imgData, 'PNG', 10, 25, pdfWidth, pdfHeight);
                doc.save(`lesson-${verb?.word || 'study'}.pdf`);
            } catch (err) {
                console.error("PDF Export Error:", err);
                alert("Could not generate PDF. Please try again.");
            } finally {
                if (wasHidden) setShowDetails(false);
            }
        }, wasHidden ? 500 : 0);
    };

    return (
        <div className="lesson-card fade-in" id={`pdf-content-${content.id}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ textTransform: 'lowercase', margin: 0, color: '#0f172a' }}>{displayWord || '...'}</h3>
                    <button
                        onClick={() => speak(displayWord)}
                        className="btn-icon"
                        style={{ fontSize: '1.1rem', background: 'transparent', color: '#10b981' }}
                        title="Listen"
                    >
                        🔊
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#10b981' }}>{cardScore} pts</span>
                    <span className="badge">{verb?.level || '...'}</span>
                </div>
            </div>
            <p style={{ color: '#334155', fontSize: '1rem', margin: '0 0 1rem 0' }}>
                <strong style={{ color: '#0f172a' }}>Translation:</strong> {verb?.translation?.pt || verb?.translation || '...'}
            </p>

            <button
                onClick={() => setShowDetails(!showDetails)}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
                {showDetails ? 'Close Lesson' : 'Start Learning'}
                <span>{showDetails ? '↑' : '↓'}</span>
            </button>

            {showDetails && (
                <div className="lesson-details fade-in" style={{ marginTop: '20px' }}>

                    {/* NEW ORDER: Forms (Core) first, then Conjugations */}
                    <div className="section">
                        <h4 style={{ fontWeight: '800', color: '#1e293b' }}>Forms (Core)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <small style={{ color: '#1e293b', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase' }}>Base</small>
                                    <button onClick={() => speak(verb?.base_form)} className="btn-icon" style={{ fontSize: '0.8rem', opacity: 0.7 }}>🔊</button>
                                </div>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{verb?.base_form || '-'}</strong>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <small style={{ color: '#1e293b', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase' }}>Past Simple</small>
                                    <button onClick={() => speak(verb?.past_simple)} className="btn-icon" style={{ fontSize: '0.8rem', opacity: 0.7 }}>🔊</button>
                                </div>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{verb?.past_simple || '-'}</strong>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <small style={{ color: '#1e293b', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase' }}>Past Participle</small>
                                    <button onClick={() => speak(verb?.past_participle)} className="btn-icon" style={{ fontSize: '0.8rem', opacity: 0.7 }}>🔊</button>
                                </div>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{verb?.past_participle || '-'}</strong>
                            </div>
                        </div>
                    </div>

                    {verb?.conjugations && Object.keys(verb.conjugations).length > 0 && (
                        <div className="section">
                            <h4 style={{ fontWeight: '800', color: '#1e293b' }}>Conjugations</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(verb.conjugations).map(([tense, data]) => {
                                    const isObject = typeof data === 'object' && data !== null;
                                    const form = isObject ? data.form : data;
                                    const example = isObject ? data.example : null;

                                    return (
                                        <div key={tense} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <small style={{ color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                                                    {tense.replace(/_/g, ' ')}
                                                </small>
                                                <strong style={{ fontSize: '0.9rem', color: '#10b981' }}>
                                                    {form || '...'}
                                                </strong>
                                            </div>
                                            {example && (
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>
                                                    "{example}"
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="section">
                        <h4 style={{ fontWeight: '800', color: '#1e293b' }}>Examples</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {context_sentences.map((s, i) => (
                                <div key={i} style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <small style={{ color: '#334155', fontWeight: '600' }}>{sentenceLabels[i] || 'Example'}</small>
                                        <p style={{ margin: '5px 0 0 0', color: '#1e293b' }}>{s}</p>
                                    </div>
                                    <button
                                        onClick={() => speak(s)}
                                        className="btn-icon"
                                        style={{ background: 'transparent', fontSize: '1.1rem' }}
                                        title="Listen"
                                    >
                                        🔊
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section">
                        <h4 style={{ fontWeight: '800', color: '#1e293b' }}>Quick Quiz</h4>
                        {quiz_questions.map((q, i) => (
                            <div key={i} className="quiz-question">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <p style={{ margin: 0, fontWeight: '500', flex: 1 }}>{q?.question || '...'}</p>
                                    {quizAnswers[i] && q?.answer && (
                                        <span style={{
                                            marginLeft: '10px',
                                            fontSize: '1.2rem',
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            backgroundColor: quizAnswers[i] === q.answer ? '#dcfce7' : '#fee2e2',
                                            color: quizAnswers[i] === q.answer ? '#10b981' : '#f43f5e',
                                            fontWeight: '700'
                                        }}>
                                            {quizAnswers[i] === q.answer ? '✓' : '✗'}
                                        </span>
                                    )}
                                </div>
                                <div className="options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Array.isArray(q?.options) && q.options.map(opt => {
                                        const isSelected = quizAnswers[i] === opt;
                                        const isCorrect = opt === q?.answer;
                                        let bgColor = '';
                                        let color = '';

                                        if (isSelected) {
                                            bgColor = isCorrect ? '#dcfce7' : '#fee2e2';
                                            color = isCorrect ? '#15803d' : '#b91c1c';
                                        }

                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleQuizAnswer(i, opt)}
                                                disabled={!!quizAnswers[i]}
                                                style={{
                                                    padding: '8px 16px',
                                                    fontSize: '0.875rem',
                                                    backgroundColor: bgColor,
                                                    color: color,
                                                    border: isSelected ? (isCorrect ? '2px solid #10b981' : '2px solid #f43f5e') : '1px solid #e2e8f0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    fontWeight: isSelected ? '700' : '400'
                                                }}
                                            >
                                                {opt}
                                                {isSelected && (isCorrect ? '✓' : '✗')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="section">
                        <h4 style={{ fontWeight: '800', color: '#1e293b' }}>Practice</h4>
                        <p style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#0f172a' }}>
                            {String(fill_gap_exercise?.sentence || '...').split('____').map((part, i, arr) => (
                                <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                        <span style={{ borderBottom: '2px solid #10b981', padding: '0 10px', color: '#10b981', fontWeight: '600' }}>
                                            ?
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                value={fillGapAnswer}
                                onChange={e => handleGapChange(e.target.value)}
                                placeholder="Type the verb..."
                                style={{ flex: 1 }}
                                onKeyPress={e => e.key === 'Enter' && checkGapAnswer()}
                            />
                            <button className="primary" onClick={checkGapAnswer} style={{ background: '#10b981' }}>Check</button>
                        </div>
                        {showGapResult && (
                            <div style={{
                                marginTop: '10px',
                                padding: '10px',
                                borderRadius: '8px',
                                backgroundColor: showGapResult.includes('Correct') ? '#dcfce7' : '#fff7ed',
                                color: showGapResult.includes('Correct') ? '#15803d' : '#c2410c',
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                {showGapResult}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonCard;
