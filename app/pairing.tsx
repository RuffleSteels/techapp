import React, {useEffect, useState} from "react";
import {ActivityIndicator, Alert, ImageBackground, Platform, ScrollView, StyleSheet, Text, View} from "react-native";
import {styles} from "../lib/theme";
import {useRouter} from "expo-router";
import {Button, Host} from '@expo/ui/swift-ui';
import {GlassView} from "expo-glass-effect";
import {BleManager} from "react-native-ble-plx";
import {IconSymbol} from "../lib/ui/icon-symbol";
import { encode as btoa, decode as atob } from "base-64";
// @ts-ignore
// import Pod from "@/assets/images/pod.svg"
import Pod from "../assets/images/pod.svg";
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";
import manager from "@/app/components/bleManager";
import {Device, Preset} from "@/lib/types";
import {loadData, saveData} from "@/lib/utils";
import {useBLE} from "@/lib/BLEProvider";

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
    const [log, setLog] = useState([]);
    const { connectDevice, sendMessage } = useBLE();
    const MY_COMPANY_ID = 0xFF01; // 16-bit ID
    const logMsg = (msg) => setLog(prev => [...prev, msg]);

    useEffect(() => {
        const startScan = () => {
            logMsg("🔍 Scanning for XIAO-BLE-SECURE...");
            setDevices([]);

            manager.startDeviceScan(null, null, (error, device) => {
                if (error) {
                    console.error(error);
                    return;
                }

                if (!device || !device.manufacturerData) return;

                const decoded = atob(device.manufacturerData);
                const bytes = new Uint8Array(decoded.length);
                for (let i = 0; i < decoded.length; i++) {
                    bytes[i] = decoded.charCodeAt(i);
                }

                // Read first 2 bytes as little-endian
                const companyId = bytes[0] | (bytes[1] << 8);

                if (companyId === MY_COMPANY_ID) {
                    logMsg(`📡 Found device: ${device.name ?? device.id}`);
                    setDevices(prev => {
                        if (prev.find(d => d.id === device.id)) return prev;
                        return [...prev, device];
                    });
                }
            });

            // Stop after 10 seconds
            setTimeout(() => {
                manager.stopDeviceScan();
                logMsg("🛑 Scan stopped");
            }, 10000);
        };

        // ✅ Wait for Bluetooth to be powered on
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
        // }
    }, []);

    const connectToDevice = async (device) => {
        try {
            const dev =   await connectDevice(device)

            if (dev) {
                logMsg("✅ Connected and services discovered");
                // const response = await sendMessage("GET_FREQ", dev);

                const d = {
                    id: findFirstMissingId(devices), currentDimension: Object.fromEntries(
                        ((await loadData('rooms')) || []).map(room => [room.id, 0]) // 0 = length
                    ), currentId: -1, deviceId: device.id, currentMode: -1, name: device.name, frequency: 100
                } as Device

                const oldDevices = await loadData('devices')
                oldDevices.push(d)

                await saveData('devices', oldDevices)

                router.back()
            }
        } catch (e) {
            console.error(e);
            logMsg("❌ Connection failed");
        }
    };

    return (
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
                        <View style={{gap: 10}}>
                            <View style={localStyles.titleContainer}>
                                <View style={localStyles.titleBox}>
                                    <Text style={[localStyles.text, localStyles.largeTitle]}>Bluetooth Pairing</Text>
                                </View>
                            </View>
                            <Text style={[localStyles.text, localStyles.headline]}>
                                Make sure the pod is powered on.{" "}
                                <Text style={[localStyles.text, localStyles.body]}>
                                    Stay within one metre of the pod. If your pod isn’t connecting, turn the pod off,
                                    wait 10 seconds and turn it back on.
                                </Text>
                            </Text>
                        </View>

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
                            failed ?
                                <View>

                                </View>
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
                                            No pod found. Make sure the pod is powered on and that you are within 1m of
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
                                            onPress={() => setFailed(false)}
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
                </View>
            </ImageBackground>
        </View>
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
        // paddingVertical: 72,
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
});
