export interface Device {
    id: number;
    name: string;
    minFrequency?: number; // Min frequency supported by the device
    maxFrequency?: number; // Max frequency supported by the device
    currentRoomId: number | null; // The ID of the currently selected room
    currentModeIndex: 0 | 1 | 2 | null; // The index (0, 1, or 2) of the selected mode for that room
    frequency: number; // The actual frequency the device is set to
    deviceId: string;
    currentDimension: Record<number | string, number>;
    currentId: number;
    currentMode: number;
}

export type Room = {
    name: string;
    dimensions: [number, number, number]; // [length, width, height]
    id: number;
};

export interface RoomMode {
    nx: number;
    ny: number;
    nz: number;
    frequency: number;
    bounces: number;
    type: "axial" | "tangential" | "oblique";
}

// Removed Preset type as modes will be calculated dynamically per device/room.
export type Preset = {
    name: string;
    frequency: number;
    id: number;
};
