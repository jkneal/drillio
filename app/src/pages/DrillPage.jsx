import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, SkipBack, SkipForward, Users, Route } from 'lucide-react';
import { performerData } from '../data/performerData';
import { movementsConfig } from '../data/movementsConfig';
import { musicConfig } from '../data/musicConfig';
import MusicModal from '../components/MusicModal';
import DrillChartModal from '../components/DrillChartModal';
import SetHeader from '../components/SetHeader';
import TipDisplay from '../components/TipDisplay';
import NicknameBadge from '../components/NicknameBadge';
import NotesModal from '../components/NotesModal';

const DrillPage = () => {
  const { movement } = useParams();
  const navigate = useNavigate();
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [currentSet, setCurrentSet] = useState(0);
  const [showMusicImage, setShowMusicImage] = useState(false);
  const [showDrillChart, setShowDrillChart] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    const savedPerformer = localStorage.getItem('drillBookPerformer');
    if (savedPerformer && performerData[savedPerformer]) {
      setSelectedPerformer(savedPerformer);
    } else {
      navigate('/');
    }
  }, [navigate]);


  if (!selectedPerformer || !performerData[selectedPerformer] || !movement) {
    return null;
  }

  const currentPerformer = performerData[selectedPerformer];
  const currentMovement = currentPerformer.movements[movement];

  if (!currentMovement) {
    return null;
  }

  const currentSetData = selectedPerformer === 'Staff'
    ? { set: currentMovement[currentSet].set }
    : currentMovement[currentSet];

  const goToNextSet = () => {
    if (currentSet < currentMovement.length - 1) {
      setCurrentSet(currentSet + 1);
    }
  };

  const goToPrevSet = () => {
    if (currentSet > 0) {
      setCurrentSet(currentSet - 1);
    }
  };

  const goToFirstSet = () => {
    setCurrentSet(0);
  };

  const goToLastSet = () => {
    setCurrentSet(currentMovement.length - 1);
  };

  const getMusicAvailability = (movement, performerKey, setNumber) => {
    // Movement should be a string like "1", "2", etc.
    const movementNum = movement.match(/\d+/)?.[0] || '1';
    
    // Determine the instrument prefix
    let prefix = performerKey;
    if (performerKey.startsWith('SD')) {
      prefix = 'SD';
    } else if (performerKey.startsWith('TD')) {
      prefix = 'TD';
    } else if (performerKey.startsWith('BD')) {
      prefix = 'BD';
    }
    
    // Check if music is available in the config
    return musicConfig[movementNum]?.[prefix]?.[String(setNumber)] || false;
  };

  const getDrillChartPath = (movementNum, setNumber) => {
    return `/drill/${movementNum}-${setNumber}.png`;
  };


  const getMusicImagePath = (setNum) => {
    const movementNum = movement.match(/\d+/)?.[0] || '1';
    if (selectedPerformer === 'Staff') {
      return `/music/Staff${movementNum}-${setNum}.png`;
    }
    
    // Determine prefix based on performer key
    let prefix = selectedPerformer;
    if (selectedPerformer.startsWith('SD')) {
      prefix = 'SD';
    } else if (selectedPerformer.startsWith('TD')) {
      prefix = 'TD';
    } else if (selectedPerformer.startsWith('BD')) {
      prefix = 'BD';
    }
    
    return `/music/${prefix}${movementNum}-${setNum}.png`;
  };

  const handleMusicClick = () => {
    if (currentSetData && currentSetData.set > 1) {
      setShowMusicImage(true);
    }
  };

  const handleDrillChartClick = () => {
    setShowDrillChart(true);
  };

  const handleNotesClick = () => {
    setShowNotes(true);
  };


  const checkHasNote = (performerId, movement, setNumber) => {
    const key = `note_${performerId}_${movement}_${setNumber}`;
    return localStorage.getItem(key) !== null;
  };



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

  const handleHomeClick = () => {
    navigate('/movements');
  };

  // Staff view
  if (selectedPerformer === 'Staff') {
    const setNumber = currentSetData.set;
    const allPerformersData = [];

    Object.keys(performerData)
      .filter(performerId => performerId !== 'Staff')
      .sort((a, b) => {
        // Sort by instrument type first (Snare, Tenor, Bass)
        const aType = performerData[a].name.split(' ')[0];
        const bType = performerData[b].name.split(' ')[0];
        if (aType !== bType) {
          const order = ['Snare', 'Tenor', 'Bass'];
          return order.indexOf(aType) - order.indexOf(bType);
        }
        // Then sort by number within same instrument type
        const aNum = parseInt(performerData[a].name.split(' ').pop());
        const bNum = parseInt(performerData[b].name.split(' ').pop());
        return aNum - bNum;
      })
      .forEach(performerId => {
        if (performerData[performerId] &&
          performerData[performerId].movements &&
          performerData[performerId].movements[movement]) {
          const performerSet = performerData[performerId].movements[movement].find(s => s.set === setNumber);
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
          <div className="flex items-center justify-between mb-6 pt-4">
            <button
              onClick={handleHomeClick}
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

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">{movementsConfig[movement]?.displayName || movement} - Staff View</h2>
            <div className="text-white/80">
              Set {setNumber} of {currentMovement.length}
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-red-600/20 border border-red-500/30 rounded-full h-2 backdrop-blur-sm">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentSet + 1) / currentMovement.length) * 100}%` }}
              />
            </div>
          </div>

          <div 
            className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <NicknameBadge movement={movement} setNumber={setNumber} />
            <SetHeader 
              setNumber={setNumber}
              subtitle="All Performers"
              onDrillChartClick={handleDrillChartClick}
              onMusicClick={handleMusicClick}
              onPathVisualizerClick={null}
              movement={movement}
              onNotesClick={null}
              hasNote={false}
              musicAvailable={getMusicAvailability(movement, 'Staff', setNumber)}
            />

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
                    <div className="mt-2">
                      <TipDisplay 
                        tip={performer.tip} 
                        nextSet={null}
                        movementVector={performer.movementVector}
                        size="small"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <NavigationControls
            currentSet={currentSet}
            totalSets={currentMovement.length}
            goToPrevSet={goToPrevSet}
            goToNextSet={goToNextSet}
            goToFirstSet={goToFirstSet}
            goToLastSet={goToLastSet}
          />

          <DrillChartModal
            show={showDrillChart}
            onClose={() => setShowDrillChart(false)}
            imagePath={getDrillChartPath(movement.match(/\d+/)?.[0] || '1', setNumber)}
            movement={movement.match(/\d+/)?.[0] || '1'}
            setNumber={setNumber}
            totalSets={currentMovement.length}
          />

          <MusicModal
            show={showMusicImage && setNumber > 1}
            onClose={() => setShowMusicImage(false)}
            movement={movement.match(/\d+/)?.[0] || '1'}
            setNumber={setNumber}
            isStaffView={true}
            performerKey={selectedPerformer}
            totalSets={currentMovement.length}
          />

        </div>
      </div>
    );
  }

  // Regular performer view
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={handleHomeClick}
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

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-2">{movementsConfig[movement]?.displayName || movement}</h2>
          <div className="text-white/80">
            Set {currentSetData.set} of {currentMovement.length}
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-red-600/20 border border-red-500/30 rounded-full h-2 backdrop-blur-sm">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSet + 1) / currentMovement.length) * 100}%` }}
            />
          </div>
        </div>

        <div
          className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6 relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <NicknameBadge movement={movement} setNumber={currentSetData.set} />
          <SetHeader 
            setNumber={currentSetData.set}
            subtitle={
              <>
                Measures: {currentSetData.measures}
                {currentSetData.counts && <span> | {currentSetData.counts} counts</span>}
              </>
            }
            onDrillChartClick={handleDrillChartClick}
            onMusicClick={handleMusicClick}
            onNotesClick={handleNotesClick}
            onPathVisualizerClick={null}
            movement={movement}
            hasNote={checkHasNote(selectedPerformer, movement, currentSetData.set)}
            musicAvailable={getMusicAvailability(movement, selectedPerformer, currentSetData.set)}
          />

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

          <div className="mt-4 space-y-2">
            {currentSetData.form && (
              <div className="flex items-center">
                <Users className="w-4 h-4 text-red-300 mr-2 flex-shrink-0" />
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

            <TipDisplay 
              tip={currentSetData.tip} 
              nextSet={currentSet < currentMovement.length - 1 ? currentMovement[currentSet + 1].tip : null}
              movementVector={currentSetData.movementVector}
              size="normal"
            />
          </div>
        </div>

        <NavigationControls
          currentSet={currentSet}
          totalSets={currentMovement.length}
          goToPrevSet={goToPrevSet}
          goToNextSet={goToNextSet}
          goToFirstSet={goToFirstSet}
          goToLastSet={goToLastSet}
        />


        <DrillChartModal
          show={showDrillChart}
          onClose={() => setShowDrillChart(false)}
          imagePath={getDrillChartPath(movement.match(/\d+/)?.[0] || '1', currentSetData.set)}
          movement={movement.match(/\d+/)?.[0] || '1'}
          setNumber={currentSetData.set}
          totalSets={currentMovement.length}
        />

        <MusicModal
          show={showMusicImage && currentSetData.set > 1}
          onClose={() => setShowMusicImage(false)}
          movement={movement.match(/\d+/)?.[0] || '1'}
          setNumber={currentSetData.set}
          isStaffView={false}
          performerKey={selectedPerformer}
          totalSets={currentMovement.length}
        />

        <NotesModal
          show={showNotes}
          onClose={() => setShowNotes(false)}
          movement={movement}
          setNumber={currentSetData.set}
          performerId={selectedPerformer}
        />

      </div>
    </div>
  );
};

const NavigationControls = ({ currentSet, totalSets, goToPrevSet, goToNextSet, goToFirstSet, goToLastSet }) => {
  return (
    <div className="space-y-4 mb-16">
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
            {currentSet + 1} / {totalSets}
          </span>
        </div>

        <button
          onClick={goToNextSet}
          disabled={currentSet === totalSets - 1}
          className="flex items-center justify-center bg-red-600/20 hover:bg-red-600/30 disabled:bg-red-600/10 disabled:opacity-50 text-white p-3 rounded-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed border border-red-500/30"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

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
          disabled={currentSet === totalSets - 1}
          className="flex items-center text-white/80 hover:text-white disabled:opacity-50 transition-colors disabled:cursor-not-allowed"
        >
          <span className="text-sm">Last</span>
          <SkipForward className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default DrillPage;