import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, X } from 'lucide-react';

const PWAPrompt = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
    onNeedRefresh() {
      console.log('New content available - update needed');
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowInstallPrompt(false);
  };

  return (
    <>
      {(offlineReady || needRefresh) && (
        <div className="fixed bottom-4 right-4 bg-red-600/90 text-white p-4 rounded-lg shadow-lg max-w-sm backdrop-blur-sm">
          <div className="mb-2">
            {offlineReady
              ? 'App ready to work offline!'
              : 'New content available, click update to refresh.'}
          </div>
          <div className="flex gap-2">
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="bg-white text-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100"
              >
                Update
              </button>
            )}
            <button
              onClick={close}
              className="bg-red-700 text-white px-3 py-1 rounded text-sm hover:bg-red-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 bg-red-600/90 text-white p-4 rounded-lg shadow-lg max-w-sm backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Install Drillio</h3>
              <p className="text-sm text-white/90 mb-3">
                Install the app for offline access to your drill book
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-red-600 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100"
                >
                  Install
                </button>
                <button
                  onClick={() => setShowInstallPrompt(false)}
                  className="bg-red-700 text-white px-3 py-1 rounded text-sm hover:bg-red-800"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAPrompt;