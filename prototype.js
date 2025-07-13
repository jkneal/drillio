import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, SkipBack, SkipForward, Trophy, Users, Lightbulb, Music, X, Play } from 'lucide-react';

const DrillApp = () => {
    // Performer data configuration
    const performerData = {
        SD1: {
            name: "Snare Drum 1",
            number: "63",
            movements: {
                "1-Uninvited": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 3.0 steps Outside 50 yd ln", homeVisitor: "8.0 steps Behind Visitor Hash (HS)", form: "Scattered", tip: "Starting position" },
                    { set: 2, measures: "sub 40", counts: "40", leftRight: "Left: 2.0 steps Inside 45 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Snare Diagonal", tip: "Hold for 32 counts, then move left backward (7.5-to-5) for 8 counts" },
                    { set: 3, measures: "2 - 13", counts: "8", leftRight: "Left: 4.0 steps Inside 40 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Snare Line", tip: "Move left (10.7-to-5) for 8 counts" },
                    { set: 4, measures: "14 - 17", counts: "16", leftRight: "Left: 3.0 steps Outside 40 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Line with Tenors", tip: "Move left (18.3-to-5) for 16 counts" },
                    { set: 5, measures: "18 - 20", counts: "12", leftRight: "Left: 3.0 steps Outside 40 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Line with Tenors", tip: "Hold for 12 counts" },
                    { set: 6, measures: "21 - 22", counts: "8", leftRight: "Left: 1.0 steps Outside 35 yd ln", homeVisitor: "5.0 steps In Front Of Visitor Hash (HS)", form: "Line full battery", tip: "Move left backward (8.2-to-5) for 8 counts" },
                    { set: 7, measures: "23", counts: "4", leftRight: "Left: 3.5 steps Outside 35 yd ln", homeVisitor: "8.0 steps In Front Of Visitor Hash (HS)", form: "Line full battery", tip: "Move left backward (8.2-to-5) for 4 counts" },
                    { set: 8, measures: "24 - 34", counts: "44", leftRight: "Left: 2.0 steps Inside 30 yd ln", homeVisitor: "11.0 steps In Front Of Visitor Hash (HS)", form: "Line full battery", tip: "Move left backward (8.2-to-5) for 4 counts, then hold for 40 counts" },
                    { set: 9, measures: "35 - 43", counts: "36", leftRight: "Left: 2.0 steps Inside 30 yd ln", homeVisitor: "10.0 steps Behind Home Hash (HS)", form: "Line full battery", tip: "Move backward (12.9-to-5) for 12 counts, then hold for 24 counts" }
                ],
                "2-TBD": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: On 50 yd ln", homeVisitor: "On Home Hash (HS)", form: "Scattered", tip: "Starting position" },
                    { set: 2, measures: "1 - 8", counts: "32", leftRight: "Right: 2.0 steps Inside 45 yd ln", homeVisitor: "4.0 steps Behind Home Hash (HS)", form: "Block formation", tip: "Move into position for 32 counts" },
                    { set: 3, measures: "9 - 16", counts: "32", leftRight: "Right: 1.0 steps Outside 40 yd ln", homeVisitor: "6.0 steps In Front Of Home Hash (HS)", form: "Company front", tip: "Adjust spacing and hold for 32 counts" }
                ],
                "3-Transition": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 2.0 steps Outside 35 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Line full battery", tip: "Transition starting position" },
                    { set: 2, measures: "1 - 4", counts: "16", leftRight: "Right: 4.0 steps Inside 30 yd ln", homeVisitor: "2.0 steps Behind Visitor Hash (HS)", form: "Diagonal formation", tip: "Move into diagonal for 16 counts" },
                    { set: 3, measures: "5 - 8", counts: "16", leftRight: "Right: 1.0 steps Outside 25 yd ln", homeVisitor: "6.0 steps In Front Of Visitor Hash (HS)", form: "Arc formation", tip: "Flow into arc shape for 16 counts" },
                    { set: 4, measures: "9 - 12", counts: "16", leftRight: "Right: 3.0 steps Inside 20 yd ln", homeVisitor: "4.0 steps Behind Home Hash (HS)", form: "Wedge formation", tip: "Form wedge shape for 16 counts" },
                    { set: 5, measures: "13 - 16", counts: "16", leftRight: "Right: On 15 yd ln", homeVisitor: "8.0 steps In Front Of Home Hash (HS)", form: "Line full battery", tip: "Reform battery line for 16 counts" }
                ],
                "4-Ballad": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 1.5 steps Outside 40 yd ln", homeVisitor: "12.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Ballad starting position" },
                    { set: 2, measures: "1 - 8", counts: "32", leftRight: "Left: 2.5 steps Inside 35 yd ln", homeVisitor: "10.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Slow drift movement for 32 counts" },
                    { set: 3, measures: "9 - 16", counts: "32", leftRight: "Left: 4.0 steps Outside 30 yd ln", homeVisitor: "8.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Continue drift for 32 counts" },
                    { set: 4, measures: "17 - 24", counts: "32", leftRight: "Left: 1.0 steps Inside 25 yd ln", homeVisitor: "6.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Gradual movement for 32 counts" },
                    { set: 5, measures: "25 - 32", counts: "32", leftRight: "Left: 3.0 steps Outside 20 yd ln", homeVisitor: "4.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Slow approach for 32 counts" },
                    { set: 6, measures: "33 - 40", counts: "32", leftRight: "Left: 2.0 steps Inside 15 yd ln", homeVisitor: "2.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Final approach for 32 counts" },
                    { set: 7, measures: "41 - 48", counts: "32", leftRight: "Left: On 10 yd ln", homeVisitor: "On Visitor Hash (HS)", form: "Concert formation", tip: "Hold final position for 32 counts" }
                ],
                "5-Closer": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 3.0 steps Inside 45 yd ln", homeVisitor: "15.0 steps In Front Of Home Hash (HS)", form: "Scattered", tip: "Closer starting position" },
                    { set: 2, measures: "1 - 6", counts: "24", leftRight: "Right: 1.0 steps Outside 40 yd ln", homeVisitor: "12.0 steps In Front Of Home Hash (HS)", form: "Moving formation", tip: "Begin closer sequence for 24 counts" },
                    { set: 3, measures: "7 - 12", counts: "24", leftRight: "Right: 4.0 steps Inside 35 yd ln", homeVisitor: "9.0 steps In Front Of Home Hash (HS)", form: "Line with Tenors", tip: "Form drumline for 24 counts" },
                    { set: 4, measures: "13 - 18", counts: "24", leftRight: "Right: 2.0 steps Outside 30 yd ln", homeVisitor: "6.0 steps In Front Of Home Hash (HS)", form: "Line full battery", tip: "Full battery line for 24 counts" },
                    { set: 5, measures: "19 - 24", counts: "24", leftRight: "Right: On 25 yd ln", homeVisitor: "3.0 steps In Front Of Home Hash (HS)", form: "Line full battery", tip: "Hold formation for 24 counts" },
                    { set: 6, measures: "25 - 30", counts: "24", leftRight: "Right: 3.5 steps Inside 20 yd ln", homeVisitor: "On Home Hash (HS)", form: "Line full battery", tip: "Powerful movement for 24 counts" },
                    { set: 7, measures: "31 - 36", counts: "24", leftRight: "Right: 1.5 steps Outside 15 yd ln", homeVisitor: "3.0 steps Behind Home Hash (HS)", form: "Line full battery", tip: "Drive backwards for 24 counts" },
                    { set: 8, measures: "37 - 42", counts: "24", leftRight: "Right: 2.5 steps Inside 10 yd ln", homeVisitor: "6.0 steps Behind Home Hash (HS)", form: "Line full battery", tip: "Continue drive for 24 counts" },
                    { set: 9, measures: "43 - 48", counts: "24", leftRight: "Right: On 5 yd ln", homeVisitor: "9.0 steps Behind Home Hash (HS)", form: "Line full battery", tip: "Approach finale for 24 counts" },
                    { set: 10, measures: "49 - 54", counts: "24", leftRight: "Right: 4.0 steps Outside Goal Line", homeVisitor: "12.0 steps Behind Home Hash (HS)", form: "Line full battery", tip: "Final position - hold for impact!" }
                ]
            }
        },
        Staff: {
            name: "Staff View",
            number: "ALL",
            movements: {
                "1-Uninvited": [
                    { set: 1 }, { set: 2 }, { set: 3 }, { set: 4 }, { set: 5 },
                    { set: 6 }, { set: 7 }, { set: 8 }, { set: 9 }
                ],
                "2-TBD": [
                    { set: 1 }, { set: 2 }, { set: 3 }
                ],
                "3-Transition": [
                    { set: 1 }, { set: 2 }, { set: 3 }, { set: 4 }, { set: 5 }
                ],
                "4-Ballad": [
                    { set: 1 }, { set: 2 }, { set: 3 }, { set: 4 }, { set: 5 }, { set: 6 }, { set: 7 }
                ],
                "5-Closer": [
                    { set: 1 }, { set: 2 }, { set: 3 }, { set: 4 }, { set: 5 },
                    { set: 6 }, { set: 7 }, { set: 8 }, { set: 9 }, { set: 10 }
                ]
            }
        },
        SD2: {
            name: "Snare Drum 2",
            number: "45",
            movements: {
                "1-Uninvited": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 2.0 steps Outside 50 yd ln", homeVisitor: "6.0 steps Behind Visitor Hash (HS)", form: "Scattered", tip: "Starting position" },
                    { set: 2, measures: "sub 40", counts: "40", leftRight: "Right: 1.0 steps Inside 45 yd ln", homeVisitor: "2.0 steps Behind Visitor Hash (HS)", form: "Snare Diagonal", tip: "Hold for 32 counts, then move right backward for 8 counts" }
                ],
                "2-TBD": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 1.0 steps Outside 50 yd ln", homeVisitor: "On Home Hash (HS)", form: "Scattered", tip: "Starting position" }
                ],
                "3-Transition": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 1.0 steps Outside 35 yd ln", homeVisitor: "2.0 steps Behind Visitor Hash (HS)", form: "Line full battery", tip: "Transition starting position" }
                ],
                "4-Ballad": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 2.5 steps Outside 40 yd ln", homeVisitor: "10.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Ballad starting position" }
                ],
                "5-Closer": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 2.0 steps Inside 45 yd ln", homeVisitor: "13.0 steps In Front Of Home Hash (HS)", form: "Scattered", tip: "Closer starting position" }
                ]
            }
        },
        TD1: {
            name: "Tenor Drum 1",
            number: "27",
            movements: {
                "1-Uninvited": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: 1.0 steps Inside 50 yd ln", homeVisitor: "10.0 steps Behind Visitor Hash (HS)", form: "Scattered", tip: "Starting position" }
                ],
                "2-TBD": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 3.0 steps Outside 50 yd ln", homeVisitor: "2.0 steps Behind Home Hash (HS)", form: "Scattered", tip: "Starting position" }
                ],
                "3-Transition": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: On 35 yd ln", homeVisitor: "4.0 steps Behind Visitor Hash (HS)", form: "Line full battery", tip: "Transition starting position" }
                ],
                "4-Ballad": [
                    { set: 1, measures: "0", counts: "", leftRight: "Left: On 40 yd ln", homeVisitor: "14.0 steps Behind Visitor Hash (HS)", form: "Concert formation", tip: "Ballad starting position" }
                ],
                "5-Closer": [
                    { set: 1, measures: "0", counts: "", leftRight: "Right: 1.0 steps Inside 45 yd ln", homeVisitor: "17.0 steps In Front Of Home Hash (HS)", form: "Scattered", tip: "Closer starting position" }
                ]
            }
        }
    };

    // All state declarations
    const [selectedMovement, setSelectedMovement] = useState(null);
    const [selectedPerformer, setSelectedPerformer] = useState(null);
    const [currentSet, setCurrentSet] = useState(0);
    const [inspirationalQuote, setInspirationalQuote] = useState('');
    const [isLoadingQuote, setIsLoadingQuote] = useState(true);
    const [showMusicImage, setShowMusicImage] = useState(false);
    const [musicImageError, setMusicImageError] = useState(false);
    const [showMovementVideo, setShowMovementVideo] = useState(false);
    const [currentMovementVideo, setCurrentMovementVideo] = useState('');
    const [videoError, setVideoError] = useState(false);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Load saved performer from localStorage on app start
    useEffect(() => {
        const savedPerformer = localStorage.getItem('drillBookPerformer');
        if (savedPerformer && performerData[savedPerformer]) {
            setSelectedPerformer(savedPerformer);
        }
    }, [performerData]);

    // Save performer selection to localStorage
    const savePerformerSelection = (performerId) => {
        console.log('Saving performer:', performerId);
        console.log('Available performers:', Object.keys(performerData));
        localStorage.setItem('drillBookPerformer', performerId);
        setSelectedPerformer(performerId);
    };

    // All function definitions
    const goToNextSet = () => {
        if (currentSet < currentMovement.length - 1) {
            setCurrentSet(currentSet + 1);
            setMusicImageError(false);
        }
    };

    const goToPrevSet = () => {
        if (currentSet > 0) {
            setCurrentSet(currentSet - 1);
            setMusicImageError(false);
        }
    };

    const goToFirstSet = () => {
        setCurrentSet(0);
        setMusicImageError(false);
    };

    const goToLastSet = () => {
        setCurrentSet(currentMovement.length - 1);
        setMusicImageError(false);
    };

    const getMusicImagePath = (setNumber) => {
        return `${selectedPerformer}-${setNumber}.png`;
    };

    const handleMusicClick = () => {
        if (currentSetData && currentSetData.set > 1) {
            setShowMusicImage(true);
            setMusicImageError(false);
        }
    };

    const handleImageError = () => {
        setMusicImageError(true);
    };

    const getMovementVideoPath = (movement) => {
        return `${movement}.mp4`;
    };

    const handleMovementVideoClick = (movement) => {
        setCurrentMovementVideo(movement);
        setShowMovementVideo(true);
        setVideoError(false);
    };

    const handleVideoError = () => {
        setVideoError(true);
    };

    // Touch handling
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentSet < currentMovement.length - 1) {
            goToNextSet();
        }
        if (isRightSwipe && currentSet > 0) {
            goToPrevSet();
        }
    };

    useEffect(() => {
        const generateInspirationalQuote = async () => {
            try {
                setIsLoadingQuote(true);
                const prompt = `Generate an inspirational quote about marching band, drumming, or practice. The quote should be motivating for high school marching band students and relate to themes like teamwork, precision, dedication, or musical excellence. Keep it under 30 words and make it uplifting. Only return the quote text, nothing else.`;

                const response = await window.claude.complete(prompt);
                setInspirationalQuote(response.trim());
            } catch (error) {
                console.error('Error generating quote:', error);
                setInspirationalQuote('"Every step on the field is a note in our symphony of excellence."');
            } finally {
                setIsLoadingQuote(false);
            }
        };

        generateInspirationalQuote();
    }, []);

    // If no performer selected, show performer selection
    if (!selectedPerformer) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8 pt-8">
                        <div className="flex items-center justify-center mb-4">
                            <img
                                src="drill-book-logo.png"
                                alt="Drill Book Logo"
                                className="w-8 h-8 mr-3"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                            <h1 className="text-2xl font-bold text-white tracking-wider uppercase font-sans">Drill Book</h1>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Edgewood 2025 - Transient</h2>
                        <div className="bg-black/40 border-2 border-white/40 rounded-lg p-3 backdrop-blur-sm mb-4 shadow-lg">
                            <p className="text-white text-lg mb-4">
                                Select your performer:
                            </p>
                            <select
                                value=""
                                onChange={(e) => savePerformerSelection(e.target.value)}
                                className="w-full bg-red-600/20 border border-red-500/30 rounded-lg p-3 text-white text-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                                <option value="" disabled className="bg-gray-800">Choose your position...</option>
                                <option value="Staff" className="bg-gray-800">
                                    Staff View (ALL)
                                </option>
                                {Object.keys(performerData).filter(id => id !== 'Staff').map((performerId) => (
                                    <option key={performerId} value={performerId} className="bg-gray-800">
                                        {performerData[performerId].name} (#{performerData[performerId].number})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Championship Footer */}
                    <div className="mt-8">
                        <div className="relative z-10">
                            <div className="mb-4">
                                <div className="w-full">
                                    <div className="flex items-center justify-center mb-2 w-full">
                                        <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                                        <span className="text-yellow-200 font-semibold">State Champions</span>
                                        <Trophy className="w-6 h-6 text-yellow-400 ml-2" />
                                    </div>
                                    <div className="text-sm text-red-200 text-center">2018 • 2022 • 2023 • 2024</div>
                                    <div className="text-xs text-red-300 mt-1 text-center">ISSMA Open Class C</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // After performer is selected, show movement selection or drill content
    if (!selectedPerformer) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
                <div className="max-w-md mx-auto pt-8">
                    <div className="text-center text-white">
                        <p>No performer selected</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentPerformer = performerData[selectedPerformer];

    // Safety check to ensure currentPerformer exists
    if (!currentPerformer) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
                <div className="max-w-md mx-auto pt-8">
                    <div className="text-center text-white">
                        <p>Performer data not found: "{selectedPerformer}"</p>
                        <p className="text-sm mt-2">Available performers: {Object.keys(performerData).join(', ')}</p>
                        <button
                            onClick={() => {
                                localStorage.removeItem('drillBookPerformer');
                                setSelectedPerformer(null);
                            }}
                            className="mt-4 text-red-300 hover:text-red-200"
                        >
                            Reset selection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedMovement) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8 pt-8">
                        <div className="flex items-center justify-center mb-4">
                            <img
                                src="drill-book-logo.png"
                                alt="Drill Book Logo"
                                className="w-8 h-8 mr-3"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                            <h1 className="text-2xl font-bold text-white tracking-wider uppercase font-sans">Drill Book</h1>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Edgewood 2025 - Transient</h2>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-white mb-4">Select Movement:</h2>
                        {Object.keys(currentPerformer.movements).map((movement) => (
                            <div key={movement} className="flex items-center space-x-3">
                                <button
                                    onClick={() => {
                                        setSelectedMovement(movement);
                                        setCurrentSet(0);
                                    }}
                                    className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-white p-4 rounded-lg backdrop-blur-sm transition-all duration-200 border border-red-500/30"
                                >
                                    <div className="text-left">
                                        <div className="font-semibold text-lg">{movement}</div>
                                        <div className="text-sm opacity-80">
                                            {selectedPerformer === 'Staff'
                                                ? `${currentPerformer.movements[movement].length} sets`
                                                : `${currentPerformer.movements[movement].length} sets`}
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleMovementVideoClick(movement)}
                                    className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg p-3 transition-all duration-200"
                                    title="View movement animation"
                                >
                                    <Play className="w-5 h-5 text-green-300" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Selected Performer Info */}
                    <div className="mt-6">
                        <div className="bg-black/40 border-2 border-white/40 rounded-lg p-3 backdrop-blur-sm shadow-lg">
                            <p className="text-white text-lg">
                                Selected: <span className="font-bold">{currentPerformer.name}</span>
                                {selectedPerformer !== 'Staff' && (
                                    <span> | Number: <span className="font-bold">{currentPerformer.number}</span></span>
                                )}
                            </p>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('drillBookPerformer');
                                    setSelectedPerformer(null);
                                    setSelectedMovement(null);
                                }}
                                className="mt-2 text-sm text-red-300 hover:text-red-200 transition-colors"
                            >
                                Change performer
                            </button>
                        </div>
                    </div>

                    {/* Championship Footer */}
                    <div className="mt-8">
                        <div className="relative z-10">
                            <div className="mb-4">
                                <div className="w-full">
                                    <div className="flex items-center justify-center mb-2 w-full">
                                        <Trophy className="w-6 h-6 text-yellow-400 mr-2" />
                                        <span className="text-yellow-200 font-semibold">State Champions</span>
                                        <Trophy className="w-6 h-6 text-yellow-400 ml-2" />
                                    </div>
                                    <div className="text-sm text-red-200 text-center">2018 • 2022 • 2023 • 2024</div>
                                    <div className="text-xs text-red-300 mt-1 text-center">ISSMA Open Class C</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Movement Video Modal */}
                    {showMovementVideo && currentMovementVideo && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-4xl max-h-full overflow-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-white font-bold text-lg">
                                        {currentMovementVideo} Animation
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowMovementVideo(false);
                                            setCurrentMovementVideo('');
                                            setVideoError(false);
                                        }}
                                        className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                                <div className="text-center">
                                    {!videoError ? (
                                        <video
                                            controls
                                            className="max-w-full max-h-96 rounded"
                                            onError={handleVideoError}
                                        >
                                            <source src={getMovementVideoPath(currentMovementVideo)} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    ) : (
                                        <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
                                            <Play className="w-12 h-12 text-red-300 mx-auto mb-4" />
                                            <p className="text-white/80">
                                                Animation not available
                                            </p>
                                            <p className="text-white/60 text-sm mt-1">
                                                {getMovementVideoPath(currentMovementVideo)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentMovement = currentPerformer.movements[selectedMovement];
    const currentSetData = selectedPerformer === 'Staff'
        ? { set: currentMovement[currentSet].set }
        : currentMovement[currentSet];

    // Staff view renders differently
    if (selectedPerformer === 'Staff') {
        const setNumber = currentSetData.set;
        const allPerformersData = [];

        // Collect data for all performers for this set
        Object.keys(performerData).forEach(performerId => {
            if (performerId !== 'Staff' &&
                performerData[performerId] &&
                performerData[performerId].movements &&
                performerData[performerId].movements[selectedMovement]) {
                const performerSet = performerData[performerId].movements[selectedMovement].find(s => s.set === setNumber);
                if (performerSet) {
                    allPerformersData.push({
                        id: performerId,
                        name: performerData[performerId].name,
                        number: performerData[performerId].number,
                        ...performerSet
                    });
                }
            }
        });

        return (
            <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pt-4">
                        <button
                            onClick={() => setSelectedMovement(null)}
                            className="flex items-center text-white hover:text-red-200 transition-colors"
                        >
                            <Home className="w-6 h-6 mr-2" />
                            <span>Home</span>
                        </button>
                        <div className="bg-red-600/20 border border-red-500/30 rounded-lg px-3 py-1 backdrop-blur-sm">
              <span className="text-white font-semibold">
                Staff View | ALL
              </span>
                        </div>
                    </div>

                    {/* Movement Title */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">{selectedMovement} - Staff View</h2>
                        <div className="text-white/80">
                            Set {setNumber} of {currentMovement.length}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="bg-red-600/20 border border-red-500/30 rounded-full h-2 backdrop-blur-sm">
                            <div
                                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentSet + 1) / currentMovement.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Staff Set Information */}
                    <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-white">SET {setNumber}</h2>
                            <div className="text-white/80 text-lg">All Performers</div>
                        </div>

                        {/* All Performers Grid */}
                        <div className="space-y-3">
                            {allPerformersData.map((performer) => (
                                <div key={performer.id} className="bg-red-700/20 border border-red-500/30 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-white text-sm">
                                            {performer.id} - {performer.name} (#{performer.number})
                                        </div>
                                        {performer.form && (
                                            <div className="flex items-center">
                                                <Users className="w-3 h-3 text-red-300 mr-1" />
                                                <span className="text-white/80 text-xs">{performer.form}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                        <div className="text-white/90">
                                            <span className="text-white/60">L-R:</span> {performer.leftRight}
                                        </div>
                                        <div className="text-white/90">
                                            <span className="text-white/60">F-B:</span> {performer.homeVisitor}
                                        </div>
                                    </div>
                                    {performer.tip && (
                                        <div className="mt-2 flex items-start">
                                            <Lightbulb className="w-3 h-3 text-yellow-300 mr-1 mt-0.5 flex-shrink-0" />
                                            <div className="text-white/70 text-xs leading-relaxed">
                                                {performer.tip.split(/(hold|Hold|HOLD)/i).map((part, index) =>
                                                        /^(hold|Hold|HOLD)$/i.test(part) ? (
                                                            <span key={index} className="bg-yellow-400 text-black px-1 rounded font-semibold">
                              Hold
                            </span>
                                                        ) : (
                                                            part
                                                        )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="space-y-4 mb-16">
                        {/* Main Navigation */}
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={goToPrevSet}
                                disabled={currentSet === 0}
                                className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 disabled:opacity-50 text-white p-3 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed border border-red-500/30"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <div className="bg-red-600/20 border border-red-500/30 rounded-lg px-4 py-3 backdrop-blur-sm">
                <span className="text-white font-semibold">
                  {currentSet + 1} / {currentMovement.length}
                </span>
                            </div>

                            <button
                                onClick={goToNextSet}
                                disabled={currentSet === currentMovement.length - 1}
                                className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 disabled:opacity-50 text-white p-3 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed border border-red-500/30"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Quick Jump */}
                        <div className="flex justify-center space-x-2">
                            <button
                                onClick={goToFirstSet}
                                disabled={currentSet === 0}
                                className="flex items-center text-white/80 hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                            >
                                <SkipBack className="w-4 h-4 mr-1" />
                                <span className="text-sm">First</span>
                            </button>

                            <button
                                onClick={goToLastSet}
                                disabled={currentSet === currentMovement.length - 1}
                                className="flex items-center text-white/80 hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                            >
                                <span className="text-sm">Last</span>
                                <SkipForward className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Regular performer view
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pt-4">
                    <button
                        onClick={() => setSelectedMovement(null)}
                        className="flex items-center text-white hover:text-red-200 transition-colors"
                    >
                        <Home className="w-6 h-6 mr-2" />
                        <span>Home</span>
                    </button>
                    <div className="bg-red-600/20 border border-red-500/30 rounded-lg px-3 py-1 backdrop-blur-sm">
            <span className="text-white font-semibold">
              {selectedPerformer} | {currentPerformer.number}
            </span>
                    </div>
                </div>

                {/* Movement Title */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">{selectedMovement}</h2>
                    <div className="text-white/80">
                        Set {currentSetData.set} of {currentMovement.length}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="bg-red-600/20 border border-red-500/30 rounded-full h-2 backdrop-blur-sm">
                        <div
                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentSet + 1) / currentMovement.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Set Information */}
                <div
                    className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="text-center mb-4">
                        <div className="flex items-center justify-center mb-2">
                            <h2 className="text-2xl font-bold text-white">SET {currentSetData.set}</h2>
                            {currentSetData.set > 1 && (
                                <button
                                    onClick={handleMusicClick}
                                    className="ml-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-2 transition-all duration-200"
                                    title="View music snippet"
                                >
                                    <Music className="w-5 h-5 text-blue-300" />
                                </button>
                            )}
                        </div>
                        <div className="text-white/80 text-lg">
                            Measures: {currentSetData.measures}
                            {currentSetData.counts && <span> | {currentSetData.counts} counts</span>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
                            <div className="text-white/80 text-sm mb-1">LEFT-RIGHT POSITION</div>
                            <div className="text-white text-lg font-semibold">
                                {currentSetData.leftRight}
                            </div>
                        </div>

                        <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-4">
                            <div className="text-white/80 text-sm mb-1">FRONT-BACK POSITION</div>
                            <div className="text-white text-lg font-semibold">
                                {currentSetData.homeVisitor}
                            </div>
                        </div>
                    </div>

                    {/* Form and Tip Information */}
                    <div className="mt-4 space-y-2">
                        {currentSetData.form && (
                            <div className="flex items-start">
                                <Users className="w-4 h-4 text-red-300 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-white/80 text-sm">
                                    {currentSetData.form.split(/(line|Line|LINE)/i).map((part, index) =>
                                            /^(line|Line|LINE)$/i.test(part) ? (
                                                <span key={index} className="underline">
                        Line
                      </span>
                                            ) : (
                                                part
                                            )
                                    )}
                                </div>
                            </div>
                        )}

                        {currentSetData.tip && (
                            <div className="flex items-start">
                                <Lightbulb className="w-4 h-4 text-yellow-300 mr-2 mt-0.5 flex-shrink-0" />
                                <div className="text-white/80 text-sm leading-relaxed">
                                    {currentSetData.tip.split(/(hold|Hold|HOLD)/i).map((part, index) =>
                                            /^(hold|Hold|HOLD)$/i.test(part) ? (
                                                <span key={index} className="bg-yellow-400 text-black px-1 rounded font-semibold">
                        Hold
                      </span>
                                            ) : (
                                                part
                                            )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="space-y-4 mb-16">
                    {/* Main Navigation */}
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={goToPrevSet}
                            disabled={currentSet === 0}
                            className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 disabled:opacity-50 text-white p-3 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed border border-red-500/30"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>

                        <div className="bg-red-600/20 border border-red-500/30 rounded-lg px-4 py-3 backdrop-blur-sm">
              <span className="text-white font-semibold">
                {currentSet + 1} / {currentMovement.length}
              </span>
                        </div>

                        <button
                            onClick={goToNextSet}
                            disabled={currentSet === currentMovement.length - 1}
                            className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 disabled:opacity-50 text-white p-3 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed border border-red-500/30"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Quick Jump */}
                    <div className="flex justify-center space-x-2">
                        <button
                            onClick={goToFirstSet}
                            disabled={currentSet === 0}
                            className="flex items-center text-white/80 hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                        >
                            <SkipBack className="w-4 h-4 mr-1" />
                            <span className="text-sm">First</span>
                        </button>

                        <button
                            onClick={goToLastSet}
                            disabled={currentSet === currentMovement.length - 1}
                            className="flex items-center text-white/80 hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
                        >
                            <span className="text-sm">Last</span>
                            <SkipForward className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>

                {/* Music Image Modal */}
                {showMusicImage && currentSetData.set > 1 && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white font-bold text-lg">
                                    Music - Set {currentSetData.set}
                                </h3>
                                <button
                                    onClick={() => setShowMusicImage(false)}
                                    className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-2 transition-all duration-200"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                            <div className="text-center">
                                {!musicImageError ? (
                                    <img
                                        src={getMusicImagePath(currentSetData.set)}
                                        alt={`Music snippet for Set ${currentSetData.set}`}
                                        className="max-w-full max-h-96 object-contain rounded"
                                        onError={handleImageError}
                                    />
                                ) : (
                                    <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
                                        <Music className="w-12 h-12 text-red-300 mx-auto mb-4" />
                                        <p className="text-white/80">
                                            Music snippet not available
                                        </p>
                                        <p className="text-white/60 text-sm mt-1">
                                            {getMusicImagePath(currentSetData.set)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrillApp;