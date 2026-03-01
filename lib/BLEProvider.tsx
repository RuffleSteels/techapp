import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { BleManager, Device } from "react-native-ble-plx";
import { loadData } from "../lib/utils";

/*
  Defines the Bluetooth functionality that is shared across the app.
  This allows any screen to connect to the Arduino and send/receive data.
*/
interface BLEContextType {
    manager: BleManager;
    connectedDevice: Device | null;
    setConnectedDevice: (device: Device | null) => void;
    subscribeToRx: (
        device: Device,
        serviceUUID: string,
        charUUID: string,
        callback: (value: string) => void
    ) => void;
    unsubscribeRx: () => void;
    disconnectDevice: () => void;
    connectDevice: (device: Device) => Promise<Device | null>;
    sendMessage: (message: string, reqName?: Device | null) => Promise<string | null>;
    hasTried: boolean;
    hasBonded: number;
    lastDevice: string | null;
    isReconnecting: boolean;
    setIsReconnecting: (value: boolean) => void;
}

// Create a single Bluetooth manager instance for the entire app
const manager = new BleManager();

// Create a shared Bluetooth context
const BLEContext = createContext<BLEContextType | undefined>(undefined);

export const BLEProvider = ({ children }) => {

    // Stores the currently connected Arduino device
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

    // Tracks whether automatic reconnection has already been attempted
    const [hasTried, setHasTried] = useState<boolean>(false);

    // Used to indicate whether secure pairing (PIN) succeeded
    const [hasBonded, setHasBonded] = useState<number>(-1);

    // Stores the ID of the last paired device for auto-reconnection
    const [lastDevice, setLastDevice] = useState<string | null>(null);

    // Reference to the active Bluetooth receive subscription
    const rxSubscription = useRef<any>(null);

    // Indicates whether the app is currently reconnecting
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Helper function for logging debug messages
    const logMsg = (...args: any[]) => console.log(...args);

    /*
      Stores outgoing commands while waiting for a response from the Arduino.
      This enables reliable request–response communication.
    */
    const pendingRequests = useRef(
        new Map<string, { resolve: (val: string | null) => void; timeoutId: number }>()
    ).current;

    // Used to distinguish between user disconnects and signal loss
    const isManualDisconnect = useRef(false);

    /*
      Wraps a promise with a timeout so Bluetooth operations do not hang forever.
    */
    function withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        errorMsg = 'Operation timed out'
    ): Promise<T> {
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

    /*
      Runs once when the app starts.
      Attempts to reconnect automatically to the previously paired Arduino.
    */
    useEffect(() => {
        const tryReconnect = async () => {
            setIsReconnecting(true);
            await new Promise(res => setTimeout(res, 300)); // Short delay for BLE startup

            // Load saved device information
            const devices = await loadData('devices');

            // Stop if no device has been paired before
            if (!devices || devices.length === 0) {
                setHasTried(true);
                return;
            }

            try {
                console.log("🔄 Trying to reconnect to", devices[0].name);

                // Attempt reconnection with a timeout
                const device = await withTimeout(
                    manager.connectToDevice(devices[0].deviceId, { autoConnect: true }),
                    2000,
                    "Connection attempt timed out"
                );

                // Complete secure connection setup
                await connectDevice(device);
                console.log("✅ Reconnected to previously paired device");
                setHasTried(true);

            } catch (e: any) {
                console.warn("❌ Auto-reconnect failed:", e.message || e);
                setHasTried(true);
            }

            setIsReconnecting(false);
        };

        // Wait until Bluetooth is powered on before reconnecting
        const sub = manager.onStateChange((state) => {
            if (state === "PoweredOn") {
                tryReconnect();
                sub.remove();
            }
        }, true);

        return () => sub.remove();
    }, []);

    // Stops listening for incoming Bluetooth data
    const unsubscribeRx = () => {
        if (rxSubscription.current) {
            rxSubscription.current.remove();
            rxSubscription.current = null;
        }
    };

    /*
      Subscribes to incoming Bluetooth data from the Arduino.
      This mirrors the rx_callback() function in the Arduino code.
    */
    const subscribeToRx = (
        device: Device,
        serviceUUID: string,
        charUUID: string,
        callback: (value: string) => void
    ) => {

        // Prevent duplicate subscriptions
        if (rxSubscription.current) {
            console.log("⚠️ Already subscribed, skipping duplicate monitor");
            return;
        }

        rxSubscription.current = device.monitorCharacteristicForService(
            serviceUUID,
            charUUID,
            async (error, characteristic) => {

                // Handle Bluetooth disconnections and cancelled operations
                if (error) {
                    if (
                        error.errorCode === 201 || // DeviceDisconnected
                        error.errorCode === 205 || // OperationCancelled
                        error.message?.includes("disconnected") ||
                        error.message?.includes("cancelled")
                    ) {
                        if (isManualDisconnect.current) {
                            console.log("ℹ️ BLE manually disconnected");
                        } else {
                            console.log("⚠️ BLE unexpectedly disconnected");
                        }

                        unsubscribeRx();
                        isManualDisconnect.current = false;
                        setConnectedDevice(null);
                        return;
                    }

                    // Handle characteristic or security-related errors
                    if (error.message?.toLowerCase().includes("characteristic")) {
                        setHasBonded(0);
                    }

                    console.error("❌ BLE monitor error:", error.message);
                    unsubscribeRx();
                    setConnectedDevice(null);
                    return;
                }

                // Decode Base64 data sent from the Arduino
                if (characteristic?.value) {
                    const value = atob(characteristic.value);
                    callback(value);
                }
            }
        );
    };

    /*
      Safely disconnects from the device.
      Used when the user manually ends the Bluetooth connection.
    */
    const disconnectDevice = async (cid = null) => {
        // Only attempt to disconnect if a device is connected or an ID is provided
        if (connectedDevice || cid) {

            // Ensure the currently connected device has a valid Bluetooth ID
            if (connectedDevice?.id) {

                // Mark this as a user-initiated disconnect
                // This prevents auto-reconnect logic from triggering
                isManualDisconnect.current = true;

                // Stop listening for incoming Bluetooth data
                unsubscribeRx();

                // Cancel the Bluetooth connection to the device
                await manager.cancelDeviceConnection(
                    cid ? cid : connectedDevice.id
                );

                // Clear the stored connected device state
                setConnectedDevice(null);

                // Log the disconnect for debugging
                console.log("Disconnecting current device");
            }
        }
    };

    // Connects to the XIAO and sets up secure Bluetooth communication.
    const connectDevice = async (device: Device): Promise<Device | null> => {
        try {
            // Log which device is being connected to
            logMsg(`Connecting to ${device.name}...`);

            // Stop listening for old Bluetooth data
            unsubscribeRx();

            // If already connected to this device, reset the connection first
            if (connectedDevice && connectedDevice.id === device.id) {
                // Cancel the existing connection
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                setConnectedDevice(null);
            }

            // Connect to the Bluetooth device
            const connected = await manager.connectToDevice(
                device.id,
                { autoConnect: false }
            );

            // Short delay to allow the connection to stabilise
            await new Promise(res => setTimeout(res, 300));

            // Discover available Bluetooth services and data
            // and request device for larger message sizes
            try {
                await connected.discoverAllServicesAndCharacteristics();
                await connected.requestMTU(247).catch(() => {});
            } catch (err) {
                // If secure pairing or discovery fails, disconnect safely
                logMsg("Secure connection failed — likely PIN or pairing issue");
                await manager.cancelDeviceConnection(device.id).catch(() => {});
                return null;
            }

            const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
            const RX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

            // Subscribe to incoming UART messages sent by the device
            // This listens for responses such as "GET_FREQ:100.0" or "SET_FREQ:OK"
            // Which are a reply to messages sent by the app, such as "SET_FREQ:100.0"
            subscribeToRx(
                connected,
                UART_SERVICE_UUID,
                RX_CHAR_UUID,
                (value) => {
                    const trimmed = value.trim();
                    const [header, payload] = trimmed.split(":");

                    if (pendingRequests.has(header)) {
                        const { resolve, timeoutId } = pendingRequests.get(header)!;

                        if (payload?.trim() === "WAIT") {
                            // Don't resolve — just extend the timeout by 15s
                            console.log('Waiting for response...')
                            clearTimeout(timeoutId);
                            const newTimeoutId = setTimeout(() => {
                                pendingRequests.delete(header);
                                resolve(null);
                            }, 15000);
                            pendingRequests.set(header, { resolve, timeoutId: newTimeoutId });
                        } else {
                            // Normal response — resolve and clean up
                            clearTimeout(timeoutId);
                            pendingRequests.delete(header);
                            resolve(payload);
                        }
                    }
                }
            );

            // Save the connected device in app state
            setConnectedDevice(connected);

            // Store the device ID for automatic reconnection later
            setLastDevice(connected.id);

            // Return the connected device
            return connected;
        } catch {
            // Return null if the connection fails
            return null;
        }
    };


    // Sends a command to the device over Bluetooth and waits for a response.
    const sendMessage = async (
        message: string,
        dev: Device | null = connectedDevice
    ): Promise<string | null> => {

        // Stop immediately if no device is currently connected
        if (!dev) return null;

        const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
        const TX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

        // Convert the text message to a format that the device can understand
        const base64Msg = btoa(`${message}\n`);

        // Extract the command header (e.g. "SET_FREQ" from "SET_FREQ:100.0")
        const [header] = message.split(":");

        // If a previous command with the same header is still waiting,
        // cancel it to avoid conflicting responses
        if (pendingRequests.has(header)) {
            const { resolve, timeoutId } = pendingRequests.get(header)!;
            clearTimeout(timeoutId);
            resolve(null);
            pendingRequests.delete(header);
        }

        /*
          Create a promise that will resolve when the Arduino responds.
          The response is matched using the command header.
        */
        const promise = new Promise<string | null>((resolve) => {

            // Timeout ensures the app does not wait forever for a response
            const timeoutId = setTimeout(() => {
                pendingRequests.delete(header);
                resolve(null);
            }, 5000);

            // Store this request so it can be resolved
            // when a matching response is received via RX
            pendingRequests.set(header, { resolve, timeoutId });
        });

        // Send the command to the Arduino using the UART TX characteristic
        await dev.writeCharacteristicWithResponseForService(
            UART_SERVICE_UUID,
            TX_CHAR_UUID,
            base64Msg
        );

        // Return the promise so the caller can await the response
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
                disconnectDevice,
                connectDevice,
                sendMessage,
                hasTried,
                hasBonded,
                lastDevice,
                isReconnecting,
                setIsReconnecting
            }}
        >
            {children}
        </BLEContext.Provider>
    );
};

// Custom hook used by the rest of the app to access Bluetooth features
export const useBLE = (): BLEContextType => {
    const context = useContext(BLEContext);
    if (!context) {
        throw new Error("useBLE must be used within a BLEProvider");
    }
    return context;
};