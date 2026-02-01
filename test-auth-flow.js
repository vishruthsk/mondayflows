#!/usr/bin/env node

/**
 * Test Authentication Flow
 * Tests the complete OTP-based authentication
 */

const API_BASE = 'http://localhost:3000';

async function testAuthFlow() {
    console.log('🧪 Testing Authentication Flow\n');

    const testEmail = `test${Date.now()}@example.com`;

    try {
        // Step 1: Send OTP
        console.log('1️⃣  Sending OTP to:', testEmail);
        const sendResponse = await fetch(`${API_BASE}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail }),
        });

        const sendData = await sendResponse.json();
        console.log('   Response:', sendData);

        if (!sendData.success) {
            throw new Error('Failed to send OTP');
        }

        console.log('   ✅ OTP sent successfully\n');

        // Step 2: Get OTP from database (in production, user would get this from email)
        console.log('2️⃣  Fetching OTP from database (simulating email)...');

        // We need to get the OTP code - in dev mode it's logged to console
        // For testing, we'll prompt for it
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const code = await new Promise((resolve) => {
            readline.question('   Enter the OTP code from server logs: ', (answer) => {
                readline.close();
                resolve(answer);
            });
        });

        console.log('   Code entered:', code, '\n');

        // Step 3: Verify OTP
        console.log('3️⃣  Verifying OTP...');
        const verifyResponse = await fetch(`${API_BASE}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testEmail, code }),
        });

        const verifyData = await verifyResponse.json();
        console.log('   Response:', JSON.stringify(verifyData, null, 2));

        if (!verifyData.success) {
            throw new Error('Failed to verify OTP');
        }

        const { token, user } = verifyData.data;
        console.log('   ✅ OTP verified successfully');
        console.log('   📝 Token:', token.substring(0, 20) + '...');
        console.log('   👤 User:', user.email, '\n');

        // Step 4: Test /auth/me endpoint
        console.log('4️⃣  Testing /auth/me endpoint...');
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const meData = await meResponse.json();
        console.log('   Response:', JSON.stringify(meData, null, 2));

        if (!meData.success) {
            throw new Error('Failed to get user info');
        }

        console.log('   ✅ User info retrieved successfully');
        console.log('   Instagram connected:', meData.data.instagram_connected, '\n');

        // Step 5: Test logout
        console.log('5️⃣  Testing logout...');
        const logoutResponse = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const logoutData = await logoutResponse.json();
        console.log('   Response:', logoutData);

        if (!logoutData.success) {
            throw new Error('Failed to logout');
        }

        console.log('   ✅ Logout successful\n');

        console.log('✅ All tests passed!\n');
        console.log('Summary:');
        console.log('  - OTP sent and received');
        console.log('  - OTP verified and user created');
        console.log('  - JWT token generated');
        console.log('  - /auth/me endpoint working');
        console.log('  - Logout working');
        console.log('  - Instagram connection status included');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

testAuthFlow();
