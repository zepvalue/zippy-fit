import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';

// Mocking the navigation and supabase so the test doesn't crash
jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: { getSession: jest.fn(() => Promise.resolve({ data: { session: { access_token: '123' } } })) }
    }
}));

// Mock the API response
jest.mock('../lib/api', () => ({
    api: {
        getDashboard: jest.fn()
    }
}));

import { api } from '../lib/api';

describe('Dashboard Status Logic', () => {
    it('shows SAFE when partner has completed workout', async () => {
        // 1. Setup the mock data to simulate a "Ready" partner
        (api.getDashboard as jest.Mock).mockResolvedValue({
            hearts: 1,
            streak: 10,
            status: 'AT_RISK', // API says at risk...
            partner_completed_today: true, // ...but partner is finished!
            user_completed_today: false,
            code: 'ABCD'
        });

        render(<DashboardScreen session={{ user: { email: 'test@me.com' } }} />);

        // 2. Check if our "Clean" dashboard shows the updated status
        // We use findByText because the API call is asynchronous
        const statusText = await screen.findByText(/SAFE/i);
        expect(statusText).toBeTruthy();
    });
});