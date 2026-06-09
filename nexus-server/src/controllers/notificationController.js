import { notificationService } from '../services/notificationService.js';

export const getNotifications = async (req, res) => {
  try {
    const empId = req.user.id;
    const category = req.query.category || null;
    const notifications = await notificationService.getNotifications(empId, category);
    res.json(notifications);
  } catch (err) {
    console.error('Get Notifications Error: ', err);
    res.status(500).json({ message: 'An error occurred while fetching notifications.' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error('Get Unread Count Error:', err);
    res.status(500).json({ message: 'Failed to fetch unread count.' });
  }
};


export const markAsRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empId = req.user.id;
    await notificationService.markAsRead(id, empId);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark Notification Read Error: ', err);
    res.status(404).json({ message: err.message || 'Notification not found.' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const empId = req.user.id;
    await notificationService.markAllAsRead(empId);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark All Read Error: ', err);
    res.status(500).json({ message: 'An error occurred while updating notifications.' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empId = req.user.id;
    await notificationService.deleteNotification(id, empId);
    res.json({ message: 'Notification deleted successfully.' });
  } catch (err) {
    console.error('Delete Notification Error: ', err);
    res.status(404).json({ message: err.message || 'Notification not found.' });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    const empId = req.user.id;
    await notificationService.clearAllNotifications(empId);
    res.json({ message: 'All notifications cleared.' });
  } catch (err) {
    console.error('Clear All Notifications Error: ', err);
    res.status(500).json({ message: 'An error occurred while deleting notifications.' });
  }
};
