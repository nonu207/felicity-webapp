import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { participantAPI } from '../services/api';

const INTEREST_OPTIONS = [
    'Music', 'Dance', 'Drama', 'Theatre', 'Fine Arts', 'Photography', 'Film & Media',
    'Technology', 'Coding', 'Robotics', 'AI & ML', 'Cybersecurity', 'Science',
    'Literature', 'Creative Writing', 'Debate', 'Public Speaking', 'Quiz',
    'Sports', 'Fitness', 'Yoga', 'Gaming', 'E-Sports',
    'Finance', 'Entrepreneurship', 'Social Service', 'Environment', 'Astronomy',
];

const Onboarding = () => {
    const navigate = useNavigate();
    const { user, profile, setProfile } = useAuth();
    const [step, setStep] = useState(1); // 1: interests, 2: follow clubs
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [organizers, setOrganizers] = useState([]);
    const [selectedOrgs, setSelectedOrgs] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [saving, setSaving] = useState(false);

    // Guard: redirect if already onboarded or not a participant
    useEffect(() => {
        if (profile?.onboardingComplete) {
            navigate('/dashboard', { replace: true });
        }
        if (user && user.role !== 'participant') {
            navigate('/dashboard', { replace: true });
        }
    }, [profile, user, navigate]);

    const toggleInterest = (interest) => {
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const goToStep2 = async () => {
        setLoadingOrgs(true);
        try {
            const res = await participantAPI.getAllOrganizers();
            setOrganizers(res.data || []);
        } catch (e) {
            setOrganizers([]);
        }
        setLoadingOrgs(false);
        setStep(2);
    };

    const toggleOrg = (id) => {
        setSelectedOrgs(prev =>
            prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
        );
    };

    const finish = async () => {
        setSaving(true);
        try {
            await participantAPI.completeOnboarding({
                interests: selectedInterests,
                followedOrganizers: selectedOrgs
            });
            setProfile(prev => ({ ...prev, onboardingComplete: true }));
        } catch (e) { /* still navigate even if it fails */ }
        setSaving(false);
        navigate('/dashboard');
    };

    const skip = async () => {
        try {
            await participantAPI.completeOnboarding({});
            setProfile(prev => ({ ...prev, onboardingComplete: true }));
        } catch (e) { }
        navigate('/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 560 }}>
                {/* Progress */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
                    {[1, 2].map(n => (
                        <div key={n} style={{
                            flex: 1, height: 4, borderRadius: 99,
                            background: step >= n ? '#111' : '#e0e0e0'
                        }} />
                    ))}
                </div>

                <div className="card card-lg">
                    {step === 1 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                <h1 className="page-title" style={{ fontSize: '1.6rem', marginTop: 8 }}>What are you into?</h1>
                                <p className="text-secondary" style={{ marginTop: 4 }}>Pick your interests so we can personalise event recommendations</p>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                                {INTEREST_OPTIONS.map(interest => (
                                    <button
                                        key={interest}
                                        onClick={() => toggleInterest(interest)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 99,
                                            border: selectedInterests.includes(interest)
                                                ? '1.5px solid #111' : '1.5px solid #e0e0e0',
                                            background: selectedInterests.includes(interest)
                                                ? '#111' : '#f7f7f7',
                                            color: selectedInterests.includes(interest) ? '#fff' : '#555',
                                            font: '500 0.88rem Inter, sans-serif',
                                            cursor: 'pointer',
                                            transition: 'all 0.18s'
                                        }}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-ghost btn-full" onClick={skip}>Skip for now</button>
                                <button className="btn btn-primary btn-full" onClick={goToStep2}>
                                    Continue
                                </button>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 28 }}>
                                <h1 className="page-title" style={{ fontSize: '1.6rem', marginTop: 8 }}>Follow Clubs</h1>
                                <p className="text-secondary" style={{ marginTop: 4 }}>Stay updated with events from clubs you care about</p>
                            </div>
                            {loadingOrgs ? (
                                <div className="spinner" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', marginBottom: 24 }}>
                                    {organizers.length === 0 && <p className="text-muted" style={{ textAlign: 'center' }}>No clubs yet</p>}
                                    {organizers.map(org => {
                                        const followed = selectedOrgs.includes(org._id);
                                        return (
                                            <div key={org._id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 16px', borderRadius: 4,
                                                border: followed ? '1.5px solid #111' : '1px solid #e0e0e0',
                                                background: followed ? '#f7f7f7' : '#fff',
                                                transition: 'all 0.18s'
                                            }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{org.organizerName}</p>
                                                    <p className="text-muted">{org.organizerCategory}</p>
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${followed ? 'btn-ghost' : 'btn-primary'}`}
                                                    onClick={() => toggleOrg(org._id)}
                                                >
                                                    {followed ? 'Unfollow' : 'Follow'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-ghost btn-full" onClick={() => setStep(1)}>Back</button>
                                <button className="btn btn-primary btn-full" onClick={finish} disabled={saving}>
                                    {saving ? 'Saving...' : "Let's go!"}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', color: '#999', fontSize: '0.82rem', marginTop: 16 }}>
                    You can always update these from your profile later
                </p>
            </div>
        </div>
    );
};

export default Onboarding;
