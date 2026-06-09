import { connectDB, sql } from '../config/db.js';

export const notificationService = {
  getNotifications: async (empId, category = null) => {
    const pool = await connectDB();
    const request = pool.request().input('empId', sql.Int, empId);
    let whereClause = 'WHERE (EmpID = @empId OR EmpID IS NULL)';
    if (category && category !== 'All') {
      request.input('category', sql.VarChar, category);
      whereClause += ' AND Category = @category';
    }
    const result = await request.query(`
      SELECT NotificationID AS id, EmpID AS empId, Title AS title, Message AS message,
             IsRead AS isRead, CreatedAt AS createdAt, Category AS category, RelatedID AS relatedId
      FROM dbo.Notifications
      ${whereClause}
      ORDER BY CreatedAt DESC
    `);
    return result.recordset;
  },

  getUnreadCount: async (empId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        SELECT COUNT(*) AS count
        FROM dbo.Notifications
        WHERE (EmpID = @empId OR EmpID IS NULL) AND IsRead = 0
      `);
    return result.recordset[0].count || 0;
  },

  markAsRead: async (id, empId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('empId', sql.Int, empId)
      .query(`
        UPDATE dbo.Notifications
        SET IsRead = 1
        OUTPUT inserted.NotificationID AS id
        WHERE NotificationID = @id AND (EmpID = @empId OR EmpID IS NULL)
      `);

    if (result.recordset.length === 0) {
      throw new Error('Notification not found or access denied.');
    }
    return true;
  },

  markAllAsRead: async (empId) => {
    const pool = await connectDB();
    await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        UPDATE dbo.Notifications
        SET IsRead = 1
        WHERE EmpID = @empId OR (EmpID IS NULL AND IsRead = 0)
      `);
    return true;
  },

  deleteNotification: async (id, empId) => {
    const pool = await connectDB();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('empId', sql.Int, empId)
      .query(`
        DELETE FROM dbo.Notifications
        OUTPUT deleted.NotificationID AS id
        WHERE NotificationID = @id AND (EmpID = @empId OR EmpID IS NULL)
      `);

    if (result.recordset.length === 0) {
      throw new Error('Notification not found or access denied.');
    }
    return true;
  },

  clearAllNotifications: async (empId) => {
    const pool = await connectDB();
    await pool.request()
      .input('empId', sql.Int, empId)
      .query(`
        DELETE FROM dbo.Notifications
        WHERE EmpID = @empId
      `);
    return true;
  }
};

