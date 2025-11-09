-- Migration: Increase Feedback_Text column length to 500 characters
-- This allows for longer feedback messages as per requirements

ALTER TABLE Feedback MODIFY Feedback_Text VARCHAR2(500);

