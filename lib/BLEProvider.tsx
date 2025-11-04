// BLEProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import {loadData, saveData} from "@/lib/utils";

interface BLEContextType {
    manager: BleManager;
    connectedDevice: Device | null;
    setConnectedDevice: (device: Device | null) => void;
    subscribeToRx: (device: Device, serviceUUID: string, charUUID: string, callback: (value: string) => void) => void;
    unsubscribeRx: () => void;
    disconnectDevice: () => void;
    connectDevice: (device: Device) => Promise<boolean>;
    sendMessage: (message: string, reqName?: string) => Promise<string | null>; // 👈 new
    hasTried: boolean;
}

const manager = new BleManager();

// Provide a default value matching the type, using dummy functions
const BLEContext = createContext<BLEContextType | undefined>(undefined);

export const BLEProvider = ({ children }) => {
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [hasTried, setHasTried] = useState<boolean>(false);
    const [rxSubscription, setRxSubscription] = useState<any>(null);
    const logMsg = (...args: any[]) => console.log(...args);
    const pendingRequests = useRef(
        new Map<string, { resolve: (val: string | null) => void; timeoutId: NodeJS.Timeout }>()
    ).current;

    // Auto-reconnect on app launch
    useEffect(() => {


        const tryReconnect = async () => {
            const devices = await loadData('devices');
            if (!devices || devices.length === 0) {
                setHasTried(true)
                return
            }

            try {
                console.log("🔄 Trying to reconnect to", devices[0].name);
                const device = await manager.connectToDevice(devices[0].deviceId, { autoConnect: true });
                await connectDevice(device)
                console.log("✅ Reconnected to previously paired device");
                setHasTried(true)
            } catch (e) {
                console.warn("❌ Auto-reconnect failed", e);
                setHasTried(true)
            }
        };

        const sub = manager.onStateChange((state) => {
            if (state === "PoweredOn") {
                tryReconnect();
                sub.remove();
            }
        }, true);

        return () => sub.remove();
    }, []);
    const subscribeToRx = (
        device: Device,
        serviceUUID: string,
        charUUID: string,
        callback: (value: string) => void
    ) => {
        // If there’s already a live subscription, don’t create another
        if (rxSubscription) {
            console.log("⚠️ Already subscribed, skipping duplicate monitor");
            return;
        }

        const subscription = device.monitorCharacteristicForService(
            serviceUUID,
            charUUID,
            (error, characteristic) => {
                if (error) {
                    if (
                        error.errorCode === 201 || // DeviceDisconnected
                        error.errorCode === 205 || // OperationCancelled
                        error.message?.includes("disconnected") ||
                        error.message?.includes("cancelled")
                    ) {
                        console.log("ℹ️ BLE monitor ended:", error.message);
                        return;
                    }
                    console.error("❌ BLE monitor error:", error);
                    return;
                }

                if (characteristic?.value) {
                    const value = atob(characteristic.value);
                    callback(value);
                }
            }
        );

        setRxSubscription(subscription);
    };

    // Helper to clean up RX subscription
    const unsubscribeRx = () => {
        if (rxSubscription) {
            rxSubscription.remove();
            setRxSubscription(null);
        }
    };

    const disconnectDevice = async () => {
        if (connectedDevice) {
            unsubscribeRx();
            await manager.cancelDeviceConnection(connectedDevice.id);
            setConnectedDevice(null);

            console.log("Disconnecting current device")
        }
    }
    const connectDevice = async (device: Device): Promise<Device | null> => {        try {
            logMsg(`🔗 Connecting to ${device.name}...`);

            // 1️⃣ If already connected to same device, disconnect cleanly
            if (connectedDevice && connectedDevice.id === device.id) {
                logMsg("🔌 Already connected — resetting connection...");
                unsubscribeRx();
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                setConnectedDevice(null);
            }

            // 2️⃣ Ensure no leftover monitor from previous connection
            unsubscribeRx();

            // 3️⃣ Connect fresh (⚠️ no autoConnect to prevent silent reconnections)
            const connected = await manager.connectToDevice(device.id, { autoConnect: false });
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);

            logMsg("✅ Connected and services discovered");

            // 4️⃣ Subscribe once only
            const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
            const RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

        subscribeToRx(connected, UART_SERVICE_UUID, RX_CHAR_UUID, (value) => {
            const trimmed = value.trim();
            const [header, payload] = trimmed.split(":");
            logMsg(`📥 RX: ${header} -> ${payload}`);

            if (pendingRequests.has(header)) {
                const { resolve, timeoutId } = pendingRequests.get(header)!;
                clearTimeout(timeoutId);
                pendingRequests.delete(header);
                resolve(payload);
            } else {
                logMsg(`⚠️ No pending request for ${header} (maybe timed out)`);
            }
        });

            return connected;
        } catch (e) {
            console.error("❌ Connection failed:", e);
            logMsg("❌ Connection failed");
            return false;
        }
    };

    const sendMessage = async (
        message: string,
        dev: Device | null = connectedDevice
    ): Promise<string | null> => {
        if (!dev) {
            console.warn("⚠️ No connected device to send message to");
            return null;
        }

        const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        const TX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

        const base64Msg = btoa(`${message}\n`);
        const [header] = message.split(":");
        logMsg(`📤 Sending: ${message}`);

        // Cancel any old request with the same header
        if (pendingRequests.has(header)) {
            const { resolve, timeoutId } = pendingRequests.get(header)!;
            clearTimeout(timeoutId);
            resolve(null);
            pendingRequests.delete(header);
        }

        // Create a promise for this request
        const promise = new Promise<string | null>((resolve) => {
            const timeoutId = setTimeout(() => {
                logMsg(`⏱️ Timeout waiting for ${header}`);
                pendingRequests.delete(header);
                resolve(null);
            }, 5000);

            pendingRequests.set(header, { resolve, timeoutId });
        });

        // Send the BLE write
        await dev.writeCharacteristicWithResponseForService(
            UART_SERVICE_UUID,
            TX_CHAR_UUID,
            base64Msg
        );

        return promise;
    };
    return (
        <BLEContext.Provider
            value={{
                manager,
                connectedDevice,
                setConnectedDevice,
                subscribeToRx,
                unsubscribeRx,
                disconnectDevice,connectDevice,sendMessage,hasTried

            }}
        >
            {children}
        </BLEContext.Provider>
    );
};

export const useBLE = (): BLEContextType => {
    const context = useContext(BLEContext);
    if (!context) {
        throw new Error("useBLE must be used within a BLEProvider");
    }
    return context;
};