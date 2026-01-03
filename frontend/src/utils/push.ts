import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import api from './api';

export async function registerPush() {
    if (Capacitor.getPlatform() === 'web') return;

    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
        try {
            await api.post('/notifications/tokens/register', { token: token.value });
        } catch (e) {
            // ignore
        }
    });

    PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error', error);
    });

    PushNotifications.addListener('pushNotificationReceived', () => {
        // Optionally: in-app toast or badge update
        // console.log('Push received', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', () => {
        // Optionally navigate based on action.notification.data
        // console.log('Action performed', action);
    });
}

export async function unregisterPush(token?: string) {
    try {
        if (token) await api.post('/notifications/tokens/unregister', { token });
    } catch (e) {
        // Intentionally ignore non-fatal unregister errors
        void e;
    }
}
