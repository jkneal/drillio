import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { notificationScheduler } from '../utils/notificationScheduler';

const NotificationManager = () => {
  const [permission, setPermission] = useState('default');
  const [showBanner, setShowBanner] = useState(false);
  const [hasSeenUpdateNotification, setHasSeenUpdateNotification] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Check current permission status
      if ('Notification' in window) {
        setPermission(Notification.permission);
        
        // Check if user has seen the update notification
        const seenUpdate = localStorage.getItem('drillioUpdateNotificationSeen');
        setHasSeenUpdateNotification(seenUpdate === 'true');

        // Check if banner was previously dismissed
        const bannerDismissed = localStorage.getItem('drillioNotificationBannerDismissed');
        
        // Show banner if permission not granted and not denied and not previously dismissed
        if (Notification.permission === 'default' && bannerDismissed !== 'true') {
          setShowBanner(true);
        }
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);

    // Check for service worker support and register for periodic sync
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
      registerPeriodicSync();
    }

    // Send update notification if permissions granted and not seen
    if (Notification.permission === 'granted' && !seenUpdate) {
      sendUpdateNotification();
    }
  }, []);

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync',
      });
      
      if (status.state === 'granted') {
        await registration.periodicSync.register('drill-reminder', {
          minInterval: 3 * 24 * 60 * 60 * 1000, // 3 days
        });
      }
    } catch (error) {
      console.log('Periodic sync registration failed:', error);
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setShowBanner(false);
        // Send update notification after permission granted
        if (!hasSeenUpdateNotification) {
          sendUpdateNotification();
        }
        // Set up recurring reminders
        scheduleRecurringReminders();
        // Start the notification scheduler
        notificationScheduler.start();
      } else if (result === 'denied') {
        setShowBanner(false);
      }
    }
  };

  const sendUpdateNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('New Features in Drillio! 🎉', {
        body: 'Check out the new Quiz Mode and Music Review features to enhance your practice!',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: [
          { action: 'open', title: 'Try Quiz Mode' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
      localStorage.setItem('drillioUpdateNotificationSeen', 'true');
      setHasSeenUpdateNotification(true);
    } catch (error) {
      console.error('Failed to send update notification:', error);
    }
  };

  const scheduleRecurringReminders = async () => {
    try {
      // Calculate next reminder time (4 PM EST)
      const now = new Date();
      const nextReminder = new Date();
      nextReminder.setHours(16, 0, 0, 0); // 4 PM local time
      
      // If it's past 4 PM today, schedule for tomorrow
      if (now > nextReminder) {
        nextReminder.setDate(nextReminder.getDate() + 1);
      }
      
      // Store the next reminder time
      localStorage.setItem('drillioNextReminder', nextReminder.toISOString());
      
      // Try to register periodic sync
      await registerPeriodicSync();
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
    }
  };


  if (!showBanner || permission !== 'default') {
    return null;
  }

  return (
    <div 
      className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9999]" 
      style={{ 
        pointerEvents: 'auto',
        position: 'fixed',
        top: '5rem',
        left: '1rem',
        right: '1rem',
        zIndex: 9999,
        maxWidth: '24rem'
      }}
    >
      <div 
        className="bg-gradient-to-r from-purple-600 to-pink-600 backdrop-blur-sm rounded-lg p-4 shadow-2xl border-2 border-white/40"
        style={{
          background: 'linear-gradient(to right, #9333ea, #db2777)',
          borderRadius: '0.5rem',
          padding: '1rem',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center text-white">
            <Bell className="w-5 h-5 mr-2 flex-shrink-0" />
            <h3 className="font-semibold">Enable Notifications</h3>
          </div>
          <button
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem('drillioNotificationBannerDismissed', 'true');
            }}
            className="text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-white/90 text-sm mb-3">
          Get reminders to practice your drill and updates about new features!
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={requestPermission}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Enable
          </button>
          <button
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem('drillioNotificationBannerDismissed', 'true');
            }}
            className="flex-1 bg-black/20 hover:bg-black/30 text-white/80 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationManager;