import React, {useEffect, useState} from "react";
import {ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, View} from "react-native";
import {styles} from "../lib/theme";
import {useRouter} from "expo-router";
import {Button, Host} from '@expo/ui/swift-ui';
import {GlassView} from "expo-glass-effect";
import { ScanMode} from "react-native-ble-plx";
import {IconSymbol} from "../lib/ui/icon-symbol";
// @ts-ignore
import Pod from "../assets/images/pod.svg";
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";
import manager from "./components/bleManager";
import {Device} from "../lib/types";
import {loadData, saveData} from "../lib/utils";
import {useBLE} from "../lib/BLEProvider";

function findFirstMissingId(items: Device[]): number {
    const ids = new Set(items.map(item => item.id));
    let i = 0;
    while (ids.has(i)) {
        i++;
    }
    return i;
}

export default function Pairing() {
    const router = useRouter();
    const [devices, setDevices] = useState<any[]>([]);
    const [failed, setFailed] = useState(false)
    const [pairing, setPairing] = useState(false)
    const {connectDevice, connectedDevice, disconnectDevice } = useBLE();
    const [scanTrigger, setScanTrigger] = useState(0)
    const {sendMessage} = useBLE();
    const [calibrating, setCalibrating] = useState(false);
    useEffect(() => {
        const startScan = () => {
            setDevices([]);

            if (connectedDevice) {
                disconnectDevice()
            }

            // Start scanning for nearby Bluetooth Low Energy devices
            manager.startDeviceScan(
                null, // Scan for all BLE services (no UUID filter)

                {
                    // Allow the same device to be detected multiple times
                    // This improves reliability when scanning continuously
                    allowDuplicates: true,

                    // Use low-latency scanning for faster device discovery
                    scanMode: ScanMode.LowLatency,
                },

                // This code runs whenever a BLE device is found
                (error, device) => {
                    // Handle any Bluetooth scanning errors
                    if (error) {
                        console.error(error);
                        return;
                    }

                    // Read the device name advertised over Bluetooth
                    // Some devices use 'name', others use 'localName'
                    const deviceName = device?.name || device?.localName;

                    // Ignore devices that do not advertise a name
                    if (!deviceName) return;

                    // Only continue if the device is the expected device
                    if (deviceName !== "Acoustic Pod") return;

                    // Log the discovered device for debugging
                    console.log("Found:", deviceName, device.id);

                    // Add the device to the list of discovered devices
                    // Avoids adding duplicates if the device is seen again
                    setDevices(prev => {
                        if (prev.some(d => d.id === device.id)) return prev;
                        return [...prev, device];
                    });
                }
            );

            setTimeout(() => {
                if (devices.length === 0) {
                    manager.stopDeviceScan();
                    setFailed(true)
                }
            }, 10000);
        };

        const subscription = manager.onStateChange((state) => {
            if (state === 'PoweredOn') {
                startScan();
                subscription.remove();
            }
        }, true);

        return () => {
            try {
                manager.stopDeviceScan();
                subscription.remove();
            } catch (e) {
                console.warn("BLE cleanup error:", e);
            }
        };
    }, [scanTrigger]);const connectToDevice = async (device) => {
        try {
            const oldDevices = await loadData('devices')

            setPairing(true)
            const dev = await connectDevice(device)
            if (oldDevices && oldDevices.find(d => d.deviceId === device.id)) {
                router.back();
                setPairing(false)
                return
            }
            if (dev) {
                setPairing(false)
                setCalibrating(true)
                const calibrateResponse = await sendMessage('CALIBRATE', dev);
                console.log('CALIBRATE response:', calibrateResponse);
                setCalibrating(false)

                const d = {
                    id: findFirstMissingId(devices), currentDimension: Object.fromEntries(
                        ((await loadData('rooms')) || []).map(room => [room.id, 0])
                    ), currentId: -1, deviceId: device.id, currentMode: -1, name: device.name, frequency: 100
                } as Device

                oldDevices.push(d)
                await saveData('devices', oldDevices)

                console.log('back!')
                router.back()
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <View style={styles.container}>
                <ImageBackground
                    source={require("../assets/images/gradient.png")}
                    style={[styles.background, {}]}
                    //@ts-ignore
                    imageStyle={{
                        filter: 'brightness(0.14)',
                    }}
                    resizeMode="cover"
                >
                    <View style={[localStyles.wrapper, {justifyContent: 'space-between'}]}>
                        <ScrollView style={{
                            // flexGrow: 1,
                        }} contentContainerStyle={{gap: 16}}><View style={{height: '100%', gap: 32, paddingHorizontal: 16}}>
                            <View style={{height: 42}}>

                            </View>
                            <Host matchContents>


                            <View style={{gap: 10}}>
                                <View style={localStyles.titleContainer}>
                                    <View style={localStyles.titleBox}>
                                        <Text style={[localStyles.text, localStyles.largeTitle]}>
                                            Bluetooth Pairing
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[localStyles.text, localStyles.headline]}>
                                    Make sure the pod is switched on.{" "}
                                    <Text style={[localStyles.text, localStyles.body]}>
                                        Hold the button for 3-5 seconds, stay within one metre of the pod.
                                        If your pod isn’t showing up, turn the pod off,
                                        wait 10 seconds and turn it back on.
                                    </Text>
                                </Text>
                            </View>
                            </Host>
                            <Host matchContents>

                            <View style={{gap: 16}}>
                                {
                                    devices.map((item, i) => (

                                        <GlassView onTouchEnd={async () => {
                                            await connectToDevice(item)
                                        }} key={i} style={[localStyles.glassBox]} tintColor={'rgba(50,50,50,.7)'}
                                                   glassEffectStyle="clear">
                                            <View style={{
                                                flexDirection: 'row',
                                                height: '100%',
                                                alignItems: 'center',
                                                gap: 16
                                            }}>
                                                <Pod style={
                                                    {alignSelf: "center", marginTop: 3}
                                                } height={'90%'}/>

                                                <Text style={[localStyles.text, localStyles.headline]}>{item.name}</Text>


                                            </View>
                                            <IconSymbol style={{}} size={30} name={'chevron.forward'} color={'white'}/>
                                        </GlassView>
                                    ))
                                }
                            </View>
                            </Host>


                        </View>
                        </ScrollView>

                        <View
                            style={{
                                position: 'absolute',
                                top: 0,
                                width: '100%',
                                height: 80,
                                overflow: 'hidden',
                            }}
                        >
                            <MaskedView
                                style={StyleSheet.absoluteFill}
                                maskElement={
                                    <LinearGradient
                                        // Mask defines where blur is visible (white = visible, transparent = hidden)
                                        colors={['black', 'transparent']}
                                        start={{x: 0.5, y: 0}}
                                        end={{x: 0.5, y: 1}}
                                        style={StyleSheet.absoluteFill}
                                    />
                                }
                            >
                                {/* The blurred background with a red tint overlay */}
                                <View style={StyleSheet.absoluteFill}>
                                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}/>
                                    <View
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {backgroundColor: 'rgba(0,0,0,0.5)'}, // red tint overlay
                                        ]}
                                    />
                                </View>
                            </MaskedView>
                        </View>

                        <View style={{
                            gap: 32,
                            position: 'absolute',
                            bottom: 0,
                            // height: '100%',
                            width: '100%',
                            // marginBottom: 52,
                            alignItems: 'center',
                            alignSelf: 'center',
                            zIndex: 100
                        }}>
                            <View style={{
                                position: 'absolute',
                                bottom: 0,
                                width: '100%',
                                height: '200%',
                                overflow: 'hidden',
                            }}>
                                <MaskedView
                                    style={StyleSheet.absoluteFill}
                                    maskElement={
                                        <LinearGradient
                                            colors={['black', 'transparent']}
                                            start={{x: 0.5, y: 1}}
                                            end={{x: 0.5, y: 0}}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    }
                                >
                                    <View style={StyleSheet.absoluteFill}>
                                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}/>
                                        <View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                {backgroundColor: 'rgba(0,0,0,0.5)'},
                                            ]}
                                        />
                                    </View>
                                </MaskedView>
                            </View>
                            {
                                failed || pairing ?
                                    null
                                    :
                                    <View style={{
                                        flexDirection: 'row',
                                        gap: 16,
                                        width: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <ActivityIndicator size="large" style={{}} color="#ffffff"/>
                                        <Text style={[localStyles.text, localStyles.body, localStyles.greyed]}>
                                            Searching...
                                        </Text>
                                    </View>
                            }



                            <View style={{width: '100%', alignItems: 'center', paddingBottom: 52}}>
                                <View style={{
                                    gap: 16,
                                    width: '100%',
                                    paddingHorizontal: 12
                                }}>
                                    {failed && (
                                        <GlassView
                                            style={[localStyles.warningContainer]}
                                            glassEffectStyle="clear"
                                            tintColor="rgba(50,50,50,.5)"
                                        >
                                            <IconSymbol size={40} color="#EAAC47" name="exclamationmark.triangle.fill"/>
                                            <Text style={[localStyles.text, localStyles.body, {
                                                flexShrink: 1,
                                                flexGrow: 1,
                                                width: 0
                                            }
                                            ]}>
                                                Can&#39;t see your pod? Make sure the pod is switched on and that you are within 1m of
                                                it.
                                            </Text>
                                        </GlassView>
                                    )}

                                    {failed && (
                                        <Host matchContents={{
                                            vertical: true
                                        }}>
                                            <Button
                                                role="default"
                                                variant="glass"
                                                onPress={() => {
                                                    setFailed(false)
                                                    setScanTrigger(t=>t+1)
                                                }}
                                            >
                                                Try Again
                                            </Button>
                                        </Host>

                                    )}

                                    <Host matchContents={{
                                        vertical: true
                                    }}>
                                        <Button
                                            role="cancel"
                                            variant="glass"
                                            onPress={() => router.back()}
                                        >
                                            Cancel
                                        </Button>
                                    </Host>
                                </View>
                            </View>
                        </View>
                        {
                            pairing ? <View style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.9)',
                                zIndex: 1000000000,
                                gap: 24
                            }}>
                                <ActivityIndicator size="large" style={{}} color="#ffffff"/>
                                <Text style={[localStyles.text, localStyles.body, localStyles.greyed, {
                                    // fontSize:
                                }]}>
                                    Pairing...
                                </Text>

                            </View> : null
                        }

                    </View>
                </ImageBackground>
            </View>

            {calibrating && (
                <View style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    zIndex: 1000000000,
                }}>
                    <GlassView
                        style={{
                            width: '75%',
                            padding: 32,
                            borderRadius: 28,
                            alignItems: 'center',
                            gap: 20,
                        }}
                        tintColor="rgba(50,50,50,0.85)"
                        glassEffectStyle="regular"
                    >
                        <View style={{
                            width: 52,
                            height: 52,
                            borderRadius: 26,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <IconSymbol name="waveform.path" color="white" size={26}/>
                        </View>
                        <View style={{alignItems: 'center', gap: 8}}>
                            <Text style={[localStyles.text, localStyles.headline]}>
                                Calibrating
                            </Text>
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{marginTop: 4}}/>
                            <Text style={[localStyles.text, localStyles.footnote, {color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontWeight: 'normal'}]}>
                                Please keep the pod still and stay within range...
                            </Text>
                        </View>
                    </GlassView>
                </View>
            )}</>

    );
}

const localStyles = StyleSheet.create({
    body: {
        fontSize: 17,
        fontWeight: 'semibold'
    },
    warningContainer: {
        paddingHorizontal: 24,
        // paddingRight: 24,
        paddingVertical: 16,
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        borderRadius: 24,
        width: '100%'
    },
    glassBox: {
        width: '100%',
        height: 88,
        flexDirection: 'row',

        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
        overflow: "hidden",
        alignItems: "center",
        // position: "absolute",
        justifyContent: "space-between",
        // backgroundColor: "rgba(0, 0, 0, 0,8)", // light translucent layer
    },

    wrapper: {
        width: "100%",
        height: "100%",
        paddingHorizontal: 0,
        paddingBottom: 0,
        justifyContent: "space-between"
    },
    titleBox: {
        width: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
        alignItems: "center",
    },
    headline: {
        fontSize: 17,
        fontWeight: "bold",
    },
    largeTitle: {
        fontSize: 34,
        fontWeight: "bold",
    },
    titleContainer: {
        gap: 10,
    },
    text: {
        color: "#fff",
    },

    greyed: {
        color: "#afafaf",
    },
    subheadline: {
        fontSize: 15,
        fontWeight: "regular",

    },
    footnote: {
        fontSize: 13,
        fontWeight: "bold",
    },
});
