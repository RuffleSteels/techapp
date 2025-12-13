// BLEProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import {loadData, saveData} from "../lib/utils";

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
    hasBonded: number;
    lastDevice: string;
    isReconnecting: boolean;
    setIsReconnecting: (value: boolean) => void;
}

const manager = new BleManager();

// Provide a default value matching the type, using dummy functions
const BLEContext = createContext<BLEContextType | undefined>(undefined);

export const BLEProvider = ({ children }) => {
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [hasTried, setHasTried] = useState<boolean>(false);
    const [hasBonded, setHasBonded] = useState<number>(-1);
    const [lastDevice, setLastDevice] = useState<string>(null);
    // const [rxSubscription, setRxSubscription] = useState<any>(null);
    const rxSubscription = useRef<any>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const [pairedDevice, setPairedDevice] = useState(null);

    useEffect(() => {
        if (!connectedDevice) return;

        // 🔐 PIN HAS BEEN ENTERED AND ACCEPTED
        console.log("🔐 Pairing completed (PIN accepted)");

        // Anything that must wait for PIN goes here:
        // - navigation
        // - reading secure characteristics
        // - enabling UI
        // - saving device
        // - router.back()

    }, [connectedDevice]);

    const logMsg = (...args: any[]) => console.log(...args);
    const pendingRequests = useRef(
        new Map<string, { resolve: (val: string | null) => void; timeoutId: NodeJS.Timeout }>()
    ).current;
    const isManualDisconnect = useRef(false);
    function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg = 'Operation timed out'): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
            promise
                .then((res) => {
                    clearTimeout(timeout);
                    resolve(res);
                })
                .catch((err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
        });
    }
    // Auto-reconnect on app launch
    useEffect(() => {
        const tryReconnect = async () => {
            setIsReconnecting(true)
            await new Promise(res => setTimeout(res, 300)); // wait a bit
            const devices = await loadData('devices');

            if (!devices || devices.length === 0) {
                setHasTried(true)
                return
            }
            try {
                console.log("🔄 Trying to reconnect to", devices[0].name);

                const device = await withTimeout(
                    manager.connectToDevice(devices[0].deviceId, { autoConnect: true }),
                    2000, // ⏱ timeout in ms
                    "Connection attempt timed out"
                );

                await connectDevice(device);
                console.log("✅ Reconnected to previously paired device");
                setHasTried(true);

            } catch (e) {
                console.warn("❌ Auto-reconnect failed:", e.message || e);
                setHasTried(true);
            }
            setIsReconnecting(false)
        };

        const sub = manager.onStateChange((state) => {
            if (state === "PoweredOn") {
                console.log('oooo')
                tryReconnect();
                sub.remove();
            }
        }, true);

        return () => sub.remove();
    }, []);
    const unsubscribeRx = () => {
        if (rxSubscription.current) {
            rxSubscription.current.remove();
            // setRxSubscription(null);
            rxSubscription.current = null;
        }
    };

    const subscribeToRx = (
        device: Device,
        serviceUUID: string,
        charUUID: string,
        callback: (value: string) => void
    ) => {
        // If there’s already a live subscription, don’t create another
        if (rxSubscription.current) {
            console.log("⚠️ Already subscribed, skipping duplicate monitor");
            return;
        }

        const subscription = device.monitorCharacteristicForService(
            serviceUUID,
            charUUID,
            async (error, characteristic) => {
                if (error) {
                    if (
                        error.errorCode === 201 || // DeviceDisconnected
                        error.errorCode === 205 || // OperationCancelled
                        error.message?.includes("disconnected") ||
                        error.message?.includes("cancelled")
                    ) {
                        if (isManualDisconnect.current) {
                            console.log("ℹ️ BLE manually disconnected:", error.message);
                        } else {
                            console.log("⚠️ BLE unexpectedly disconnected:", error.message);

                        }
                        unsubscribeRx();
                        console.log(rxSubscription)
                        isManualDisconnect.current = false;
                        setConnectedDevice(null);
                        return;
                    }

                    if (error.message?.toLowerCase().includes("characteristic")) {
                        console.log('A characteristic error occurred: ')
                        setHasBonded(0)
                    }

                    console.error("❌ BLE monitor error:", error.message);
                    unsubscribeRx();
                    console.log(rxSubscription)
                    setConnectedDevice(null);
                    return;
                }

                if (characteristic?.value) {
                    const value = atob(characteristic.value);
                    callback(value);
                }
            }
        );

        rxSubscription.current = subscription;
    };

    // Helper to clean up RX subscription

    const disconnectDevice = async (cid = null) => {
        if (connectedDevice || cid) {
            isManualDisconnect.current = true; // 👈 mark it

            unsubscribeRx();
            await manager.cancelDeviceConnection(cid ? cid : connectedDevice.id);
            setConnectedDevice(null);
             // reset for next time

            console.log("Disconnecting current device")
        }
    }
    const connectDevice = async (device: Device): Promise<Device | null> => {
        try {
            logMsg(`🔗 Connecting to ${device.name}...`);

            // Clean up existing connection if needed
            if (connectedDevice && connectedDevice.id === device.id) {
                logMsg("🔌 Already connected — resetting connection...");
                unsubscribeRx();
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                setConnectedDevice(null);
            }

            unsubscribeRx();

            // Fresh connect (no auto-connect)
            const connected = await manager.connectToDevice(device.id, { autoConnect: false });
            await new Promise(res => setTimeout(res, 300));

            try {
                await connected.discoverAllServicesAndCharacteristics();
                await connected.requestMTU(247).catch(() => {});
            } catch (err) {
                // 👉 This can happen if pairing fails or PIN is incorrect
                logMsg("🔒 Secure connection failed during discovery — likely pairing/PIN issue");
                console.error("Discovery error:", err);
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                return null;
            }

            logMsg("🔐 Waiting for secure channel (PIN may be required)...");


            const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
            const RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

            try {
                subscribeToRx(connected, UART_SERVICE_UUID, RX_CHAR_UUID, (value) => {
                    const trimmed = value.trim();
                    const [header, payload] = trimmed.split(":");
                    logMsg(`📥 RX: ${header} -> ${payload}`);

                    setConnectedDevice(connected);

                    if (pendingRequests.has(header)) {
                        const { resolve, timeoutId } = pendingRequests.get(header)!;
                        clearTimeout(timeoutId);
                        pendingRequests.delete(header);
                        resolve(payload);
                    } else {
                        logMsg(`⚠️ No pending request for ${header} (maybe timed out)`);
                    }
                });
                setConnectedDevice(connected);
                logMsg("🔐 Secure channel established (PIN accepted)");
            } catch (err) {
                // 👉 Characteristic access failed — usually encryption/pairing issue
                logMsg("❌ Failed to subscribe to characteristic — possibly incorrect PIN or security mismatch");
                console.error("Characteristic error:", err);
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                return null;
            }

            setLastDevice(connected.id)

            return connected;

        } catch (e) {
            console.error("❌ Connection failed:", e);
            logMsg("❌ Connection failed");
            return null; // ✅ make sure all failures return null
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
                disconnectDevice, connectDevice, sendMessage, hasTried, hasBonded, lastDevice, isReconnecting, setIsReconnecting

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