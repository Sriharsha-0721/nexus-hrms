-- Migration Script: Reset all Admin accounts to 'Admin@123' for POC testing
-- Targets database table: dbo.AdminLogins

UPDATE dbo.AdminLogins
SET Password = '$2a$10$.9VLa0qABw5fUdLEgoqVeewRBPpC/Cc.zV40LfmzkKlfmgZXEird2',
    FailedAttempts = 0,
    LockoutUntil = NULL;

-- Log the action to AuditLogs
INSERT INTO dbo.AuditLogs (ActorEmpID, ActionType, ActionDesc)
VALUES (NULL, 'PASSWORD_RESET', 'All admin account passwords reset to Admin@123 for POC testing');
