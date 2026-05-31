import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import * as client from '../../api/client';

// Mock the API client
vi.mock('../../api/client', () => ({
    loginUser: vi.fn(),
}));

describe('authStore', () => {
    beforeEach(() => {
        // Reset the store state before each test
        useAuthStore.setState({ user: null });
        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have user as null initially', () => {
            const { user } = useAuthStore.getState();
            expect(user).toBeNull();
        });
    });

    describe('login', () => {
        it('should set user on successful login', async () => {
            const mockLoginUser = vi.mocked(client.loginUser);
            mockLoginUser.mockResolvedValueOnce({
                success: true,
                username: 'testuser',
            });

            const { login } = useAuthStore.getState();
            const result = await login('testuser', 'password123');

            expect(result).toBe(true);
            expect(useAuthStore.getState().user).toEqual({ username: 'testuser' });
            expect(mockLoginUser).toHaveBeenCalledWith('testuser', 'password123');
        });

        it('should return false on login failure with success: false response', async () => {
            const mockLoginUser = vi.mocked(client.loginUser);
            mockLoginUser.mockResolvedValueOnce({
                success: false,
                username: '',
            });

            const { login } = useAuthStore.getState();
            const result = await login('testuser', 'wrongpassword');

            expect(result).toBe(false);
            expect(useAuthStore.getState().user).toBeNull();
            expect(mockLoginUser).toHaveBeenCalledWith('testuser', 'wrongpassword');
        });

        it('should return false on login error (exception thrown)', async () => {
            const mockLoginUser = vi.mocked(client.loginUser);
            mockLoginUser.mockRejectedValueOnce(new Error('Network error'));

            const { login } = useAuthStore.getState();
            const result = await login('testuser', 'password123');

            expect(result).toBe(false);
            expect(useAuthStore.getState().user).toBeNull();
        });

        it('should handle multiple login attempts', async () => {
            const mockLoginUser = vi.mocked(client.loginUser);

            // First attempt - success
            mockLoginUser.mockResolvedValueOnce({
                success: true,
                username: 'user1',
            });

            const { login } = useAuthStore.getState();
            let result = await login('user1', 'pass1');
            expect(result).toBe(true);
            expect(useAuthStore.getState().user?.username).toBe('user1');

            // Second attempt - different user
            mockLoginUser.mockResolvedValueOnce({
                success: true,
                username: 'user2',
            });

            result = await login('user2', 'pass2');
            expect(result).toBe(true);
            expect(useAuthStore.getState().user?.username).toBe('user2');
        });
    });

    describe('logout', () => {
        it('should clear user on logout', async () => {
            // First login
            const mockLoginUser = vi.mocked(client.loginUser);
            mockLoginUser.mockResolvedValueOnce({
                success: true,
                username: 'testuser',
            });

            const store = useAuthStore.getState();
            await store.login('testuser', 'password123');
            expect(useAuthStore.getState().user).not.toBeNull();

            // Then logout
            store.logout();
            expect(useAuthStore.getState().user).toBeNull();
        });

        it('should be safe to logout without prior login', () => {
            const { logout } = useAuthStore.getState();
            expect(() => logout()).not.toThrow();
            expect(useAuthStore.getState().user).toBeNull();
        });
    });

    describe('state persistence', () => {
        it('should maintain state across multiple store getState calls', async () => {
            const mockLoginUser = vi.mocked(client.loginUser);
            mockLoginUser.mockResolvedValueOnce({
                success: true,
                username: 'testuser',
            });

            const { login } = useAuthStore.getState();
            await login('testuser', 'password123');

            // Call getState multiple times and verify state persists
            const state1 = useAuthStore.getState();
            const state2 = useAuthStore.getState();

            expect(state1.user).toEqual(state2.user);
            expect(state1.user?.username).toBe('testuser');
        });
    });
});
