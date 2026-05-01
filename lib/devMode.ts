// ─────────────────────────────────────────────────────────────────────────────
// DEV MODE — flip this to `false` before shipping
// ─────────────────────────────────────────────────────────────────────────────
export const DEV_MODE = false;

// A fake BLE device that satisfies the `connectedDevice` shape used across
// the app. Add / remove fields if your real Device type needs more.
export const MOCK_CONNECTED_DEVICE = {
    id: 'mock-device-001',
    name: 'Acoustic Pod',
};

// Simulates the GET_FREQ response from the real hardware.
export const MOCK_GET_FREQ_RESPONSE = {
    current: 100.0,
    min: 79.9,   // range will be [80.0, 120.0] after the ±0.1 applied in init
    max: 120.1,
};

// The device entry that gets seeded into AsyncStorage so the Home screen
// and Device screen have something to render.
export const MOCK_DEVICE_ENTRY = {
    id: 0,
    name: 'Living Room Pod',
    deviceId: MOCK_CONNECTED_DEVICE.id,
    frequency: MOCK_GET_FREQ_RESPONSE.current,
    currentId: -1,
    currentMode: -1,
    currentDimension: {},
};

// A couple of preset entries so the Presets section is non-empty.
export const MOCK_PRESETS = [
    { id: 0, name: 'Bass Trap', frequency: 85.0 },
    { id: 1, name: 'Mid Room', frequency: 100.0 },
];

// A room entry so the Rooms section is non-empty.
export const MOCK_ROOMS = [
    { id: 0, name: 'Living Room', dimensions: [5.2, 3.8, 2.6] },
    { id: 1, name: 'Studio',      dimensions: [4.0, 3.0, 2.4] },
];

/**
 * A drop-in replacement for `useBLE()` that never touches Bluetooth.
 * Use it in your screens like:
 *
 *   import { DEV_MODE, useMockBLE } from '../lib/devMode';
 *   import { useBLE } from '../lib/BLEProvider';
 *   const ble = DEV_MODE ? useMockBLE() : useBLE();
 *
 * NOTE: React's rules-of-hooks mean both hooks are always called but only
 * one result is used, which is fine as long as DEV_MODE is a compile-time
 * constant (never changes at runtime).
 */
export function useMockBLE() {
    const sendMessage = async (msg: string): Promise<any> => {
        console.log('[DEV] sendMessage:', msg);

        if (msg === 'GET_FREQ') return MOCK_GET_FREQ_RESPONSE;
        if (msg.startsWith('SET_FREQ')) return 'OK';
        if (msg === 'CALIBRATE') return 'OK';
        return 'OK';
    };

    return {
        sendMessage,
        connectedDevice: MOCK_CONNECTED_DEVICE,
        disconnectDevice: async () => { console.log('[DEV] disconnectDevice called'); },
        connectDevice: async (device: any) => device,
        isReconnecting: false,
        setIsReconnecting: (_: boolean) => {},
        lastDevice: MOCK_CONNECTED_DEVICE.id,
        hasBonded: 1,
        hasTried: true,
        unsubscribeRx: () => {},
    };
}