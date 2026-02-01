-- OTP Codes Table
-- Stores one-time passwords for email authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_otp_email_code ON otp_codes(email, code) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at) WHERE used = FALSE;

-- Clean up expired OTPs (optional, can be run periodically)
-- DELETE FROM otp_codes WHERE expires_at < NOW() OR used = TRUE;
