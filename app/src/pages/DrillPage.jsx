import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, SkipBack, SkipForward, Music, X, Users, Lightbulb, Map } from 'lucide-react';
import { performerData } from '../data/performerData';

const DrillPage = () => {
  const { movement } = useParams();
  const navigate = useNavigate();
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [currentSet, setCurrentSet] = useState(0);
  const [showMusicImage, setShowMusicImage] = useState(false);
  const [musicImageError, setMusicImageError] = useState(false);
  const [showDrillChart, setShowDrillChart] = useState(false);
  const [drillChartError, setDrillChartError] = useState(false);
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
      setMusicImageError(false);
      setDrillChartError(false);
    }
  };

  const goToPrevSet = () => {
    if (currentSet > 0) {
      setCurrentSet(currentSet - 1);
      setMusicImageError(false);
      setDrillChartError(false);
    }
  };

  const goToFirstSet = () => {
    setCurrentSet(0);
    setMusicImageError(false);
    setDrillChartError(false);
  };

  const goToLastSet = () => {
    setCurrentSet(currentMovement.length - 1);
    setMusicImageError(false);
    setDrillChartError(false);
  };

  const getMusicImagePath = (setNumber) => {
    return `/music/${selectedPerformer}-${setNumber}.png`;
  };

  const getDrillChartPath = (movementNum, setNumber) => {
    return `/drill/${movementNum}-${setNumber}.png`;
  };

  const handleMusicClick = () => {
    if (currentSetData && currentSetData.set > 1) {
      setShowMusicImage(true);
      setMusicImageError(false);
    }
  };

  const handleDrillChartClick = () => {
    setShowDrillChart(true);
    setDrillChartError(false);
  };

  const handleImageError = () => {
    setMusicImageError(true);
  };

  const handleDrillChartError = () => {
    setDrillChartError(true);
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
            <h2 className="text-xl font-bold text-white mb-2">{movement} - Staff View</h2>
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

          <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-2">
                <h2 className="text-2xl font-bold text-white">SET {setNumber}</h2>
                <button
                  onClick={handleDrillChartClick}
                  className="ml-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
                  title="View drill chart"
                >
                  <Map className="w-5 h-5 text-blue-300" />
                </button>
              </div>
              <div className="text-white/80 text-lg">All Performers</div>
            </div>

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
                            <span key={index} className="bg-yellow-600 text-black px-1 rounded font-semibold">
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

          <NavigationControls
            currentSet={currentSet}
            totalSets={currentMovement.length}
            goToPrevSet={goToPrevSet}
            goToNextSet={goToNextSet}
            goToFirstSet={goToFirstSet}
            goToLastSet={goToLastSet}
          />

          {showDrillChart && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-bold text-lg">
                    Drill Chart - Movement {movement.match(/\d+/)?.[0] || '1'}, Set {setNumber}
                  </h3>
                  <button
                    onClick={() => setShowDrillChart(false)}
                    className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="text-center">
                  {!drillChartError ? (
                    <img
                      src={getDrillChartPath(movement.match(/\d+/)?.[0] || '1', setNumber)}
                      alt={`Drill chart for Movement ${movement.match(/\d+/)?.[0] || '1'}, Set ${setNumber}`}
                      className="max-w-full max-h-96 object-contain rounded"
                      onError={handleDrillChartError}
                    />
                  ) : (
                    <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
                      <Map className="w-12 h-12 text-red-300 mx-auto mb-4" />
                      <p className="text-white/80">
                        Drill chart not available
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        {getDrillChartPath(movement.match(/\d+/)?.[0] || '1', setNumber)}
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
          <h2 className="text-xl font-bold text-white mb-2">{movement}</h2>
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
          className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm mb-6"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <h2 className="text-2xl font-bold text-white">SET {currentSetData.set}</h2>
              <button
                onClick={handleDrillChartClick}
                className="ml-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
                title="View drill chart"
              >
                <Map className="w-5 h-5 text-blue-300" />
              </button>
              {currentSetData.set > 1 && (
                <button
                  onClick={handleMusicClick}
                  className="ml-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-icon transition-all duration-200"
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
                      <span key={index} className="bg-yellow-600 text-black px-1 rounded font-semibold">
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

        <NavigationControls
          currentSet={currentSet}
          totalSets={currentMovement.length}
          goToPrevSet={goToPrevSet}
          goToNextSet={goToNextSet}
          goToFirstSet={goToFirstSet}
          goToLastSet={goToLastSet}
        />

        {showMusicImage && currentSetData.set > 1 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">
                  Music - Set {currentSetData.set}
                </h3>
                <button
                  onClick={() => setShowMusicImage(false)}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
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

        {showDrillChart && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm max-w-full max-h-full overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-lg">
                  Drill Chart - Movement {movement.match(/\d+/)?.[0] || '1'}, Set {currentSetData.set}
                </h3>
                <button
                  onClick={() => setShowDrillChart(false)}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg p-icon transition-all duration-200"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="text-center">
                {!drillChartError ? (
                  <img
                    src={getDrillChartPath(movement.match(/\d+/)?.[0] || '1', currentSetData.set)}
                    alt={`Drill chart for Movement ${movement.match(/\d+/)?.[0] || '1'}, Set ${currentSetData.set}`}
                    className="max-w-full max-h-96 object-contain rounded"
                    onError={handleDrillChartError}
                  />
                ) : (
                  <div className="bg-red-700/20 border border-red-500/30 rounded-lg p-8 text-center">
                    <Map className="w-12 h-12 text-red-300 mx-auto mb-4" />
                    <p className="text-white/80">
                      Drill chart not available
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      {getDrillChartPath(movement.match(/\d+/)?.[0] || '1', currentSetData.set)}
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