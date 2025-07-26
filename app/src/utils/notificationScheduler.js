// Fallback notification scheduler for browsers without periodic sync support
export class NotificationScheduler {
  constructor() {
    this.intervalId = null;
    this.checkInterval = 60 * 60 * 1000; // Check every hour
  }

  start() {
    // Check immediately on start
    this.checkAndSendReminder();
    
    // Then check periodically
    this.intervalId = setInterval(() => {
      this.checkAndSendReminder();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAndSendReminder() {
    // Only proceed if we have notification permission
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const endDate = new Date('2025-09-15');
    
    // Stop if past September 15, 2025
    if (now > endDate) {
      this.stop();
      return;
    }

    // Get last reminder time
    const lastReminderStr = localStorage.getItem('drillioLastReminder');
    const lastReminder = lastReminderStr ? new Date(lastReminderStr) : null;

    if (this.shouldSendReminder(lastReminder, now)) {
      await this.sendReminder();
      localStorage.setItem('drillioLastReminder', now.toISOString());
    }
  }

  shouldSendReminder(lastReminder, now) {
    if (!lastReminder) return true;

    // Calculate days since last reminder
    const daysSince = (now - lastReminder) / (1000 * 60 * 60 * 24);
    
    // Check if it's been at least 3 days
    if (daysSince < 3) return false;

    // Check if it's around 4 PM EST (between 3 PM and 5 PM)
    const hour = now.getHours();
    const estOffset = now.getTimezoneOffset() + 240; // EST is UTC-5 (240 minutes)
    const estHour = (hour + Math.floor(estOffset / 60)) % 24;
    
    return estHour >= 15 && estHour <= 17;
  }

  async sendReminder() {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Drill Review Reminder', {
        body: 'Time to review your drill and practice with the quiz mode! 🎵',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: [
          { action: 'open', title: 'Open Drillio' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    } catch (error) {
      console.error('Failed to send reminder notification:', error);
    }
  }
}

// Create and export a singleton instance
export const notificationScheduler = new NotificationScheduler();