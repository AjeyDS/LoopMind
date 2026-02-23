import { AuthState, User } from '../types';

const MOCK_USER: User = {
    id: 'user-1',
    name: 'Alex Learner',
    email: 'alex@loopmind.app',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
};

let authState: AuthState = {
    user: MOCK_USER,
    isAuthenticated: true, // pre-authenticated for the shell
};

export const authService = {
    getAuthState(): AuthState {
        return authState;
    },

    async login(email: string, _password: string): Promise<User> {
        await new Promise((r) => setTimeout(r, 800));
        authState = { user: { ...MOCK_USER, email }, isAuthenticated: true };
        return authState.user!;
    },

    async logout(): Promise<void> {
        await new Promise((r) => setTimeout(r, 300));
        authState = { user: null, isAuthenticated: false };
    },

    getUser(): User | null {
        return authState.user;
    },
};
