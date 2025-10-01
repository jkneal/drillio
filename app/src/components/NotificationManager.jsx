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


  return null;
};

export default NotificationManager;