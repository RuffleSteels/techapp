import React, {useCallback, useEffect} from "react";
import {ImageBackground, Pressable, StyleSheet, Text, View} from "react-native";
import {GlassView} from "expo-glass-effect";
import {styles} from "../../lib/theme";
// @ts-ignore
import Pod from "../../assets/images/pod.svg";
import {Button, ContextMenu, Host} from '@expo/ui/swift-ui';
import manager from "../components/bleManager";

import {
    font,
    foregroundStyle,
    frame,
    glassEffect,
    labelStyle,
    padding,
} from "@expo/ui/swift-ui/modifiers";
import {useRouter} from "expo-router";
import {IconSymbol} from "../../lib/ui/icon-symbol";
import {loadData, saveData, toDisplay} from "../../lib/utils";
import {useFocusEffect} from '@react-navigation/native';
import {Device} from "../../lib/types";
import {useBLE} from "../../lib/BLEProvider";

export default function HomeScreen() {
    const [hidden, setHidden] = React.useState(false);
    const router = useRouter();
    const {sendMessage, isReconnecting, setIsReconnecting, connectedDevice, lastDevice,hasBonded, hasTried, connectDevice, disconnectDevice, unsubscribeRx} = useBLE()
    const [hasAttempted, setHasAttempted] = React.useState(false)
    const [devices, setDevices] = React.useState<Device[]>([])
    const [devicesLoaded, setDevicesLoaded] = React.useState(false);
    const goDevice = React.useRef(-1)
    const [failed, setFailed] = React.useState(0)
    const navigating = React.useRef(false)

    useEffect(() => {
        if (goDevice.current > -1) {
            router.push({pathname: '/device', params: {id: goDevice.current}})
            setTimeout(() => setHidden(true), 100)
            goDevice.current = -1
        }
    }, [connectedDevice]);

    useFocusEffect(
        useCallback(() => {
            const timer = setTimeout(() => { navigating.current = false; }, 300);

            const init = async () => {
                const devices = await loadData('devices');
                if (devices) setDevices(devices);
                setHidden(false);
                setIsReconnecting(false);
                setDevicesLoaded(true);
            };
            init();

            return () => {
                navigating.current = true;
                clearTimeout(timer);
            };
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            if (!devicesLoaded) return;

            const init = async () => {
                if (!hasTried) {
                    console.log("⏳ Waiting for BLE attempt...");
                    return;
                }

                console.log("✅ BLE attempted:", connectedDevice?.name);

                if (devices) {
                    const connectedDeviceItem = devices.find(d => d.deviceId === connectedDevice?.id)

                    if (connectedDeviceItem) {
                        const response = await sendMessage('GET_FREQ');
                        let frequency = 0

                        if (response && typeof response !== 'string' && 'current' in response) {
                            frequency = response.current;
                        } else {
                            console.error("Failed to get frequency or got unexpected response:", response);
                        }

                        setDevices((prevDevices) => {
                            return prevDevices.map((d) =>
                                d.deviceId === connectedDevice.id
                                    ? { ...d, frequency: parseFloat(String(frequency)) }
                                    : d
                            );
                        });
                    }
                }

                setHasAttempted(true)
                setDevicesLoaded(false)

            };
            init();
        }, [hasTried,devicesLoaded, connectedDevice])
    );

    useEffect(() => {
        if (failed) {
            setTimeout(() => {
                setFailed(0)
            },8000)
        }
    }, [failed]);

    useEffect(() => {
        saveData('devices', devices)
    }, [devices]);

    useEffect(() => {
        const init = async () => {
            if (hasBonded === 0) {
                await disconnectDevice(lastDevice)
                setDevices(prev => {
                    return prev.filter(itemm => itemm.deviceId !== lastDevice)
                })
            }
        }
        init()
    }, [hasBonded]);

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require("../../assets/images/gradient.png")}
                style={styles.background}
                //@ts-ignore
                imageStyle={{
                    filter: 'brightness(0.2)',
                }}
                resizeMode="cover"
            >
                <View style={localStyles.wrapper}>
                    <View style={localStyles.titleContainer}>
                        <View style={localStyles.titleBox}>
                            <Text style={[localStyles.text, localStyles.largeTitle]}>Home</Text>
                        </View>
                        <Text style={[localStyles.text, localStyles.headline]}>My Devices</Text>
                    </View>

                    <View style={{ gap: 16 }}>
                        {devices.map((item, i) => (
                                <Host key={i}>
                                    <ContextMenu>
                                        <ContextMenu.Items>
                                            <Button
                                                label="Delete"
                                                role="destructive"
                                                systemImage="trash"
                                                onPress={async () => {
                                                    if (connectedDevice && connectedDevice.id === item.deviceId) {
                                                        disconnectDevice()
                                                    }
                                                    setDevices(prev => {
                                                        return prev.filter(itemm => itemm.id !== parseInt(String(item.id)))
                                                    })
                                                }}
                                            />
                                        </ContextMenu.Items>
                                        <ContextMenu.Trigger>
                                            <View>
                                                {(!connectedDevice || item.deviceId !== connectedDevice?.id) && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '100%',
                                                        zIndex: 10,
                                                        pointerEvents: 'none',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Host>
                                                            <Button
                                                                onPress={() => {}}
                                                                role="default"
                                                                variant="plain"
                                                                modifiers={[
                                                                    padding({
                                                                        all: 4,
                                                                    }),
                                                                    glassEffect({
                                                                        glass: {
                                                                            tint: 'rgba(255,255,255,0.2)',
                                                                            variant: 'regular',
                                                                            interactive: true,
                                                                        },
                                                                        shape: 'capsule'
                                                                    }),
                                                                ]}
                                                            >
                                                                <Text style={[localStyles.text, {
                                                                    paddingBottom: 12,
                                                                    paddingVertical: 4,
                                                                    paddingHorizontal: 8,
                                                                    paddingRight: 14,
                                                                    fontSize: 18,
                                                                    fontWeight: '600'
                                                                }]}>{isReconnecting ? 'Connecting...' : 'Connect'}</Text>
                                                            </Button>
                                                        </Host>
                                                    </View>
                                                )}

                                                <GlassView key={i} style={[localStyles.glassBox,{
                                                    pointerEvents: !hasTried || isReconnecting ? 'none' : 'auto'
                                                }]} tintColor={'rgba(50,50,50,.7)'}
                                                           glassEffectStyle="clear">

                                                    <View style={[localStyles.glassBoxBox, {
                                                        opacity: !connectedDevice || item.deviceId !== connectedDevice?.id ? .3 : 1
                                                    }]}>
                                                        <Host style={{
                                                            width: '100%',
                                                            height: '100%'
                                                        }}>
                                                            <Button
                                                                onPress={async () => {
                                                                    if (navigating.current) return;
                                                                    navigating.current = true;

                                                                    setFailed(0)
                                                                    if (!connectedDevice || item.deviceId !== connectedDevice?.id) {
                                                                        setIsReconnecting(true)
                                                                    }
                                                                    if (!connectedDevice || item.deviceId !== connectedDevice?.id) {
                                                                        if (connectedDevice) {
                                                                            await disconnectDevice()
                                                                        }
                                                                        if (!connectedDevice) {
                                                                            try {
                                                                                await manager.cancelDeviceConnection(item.deviceId).catch(() => {});

                                                                                const state = await manager.state();
                                                                                if (state !== 'PoweredOn') {
                                                                                    setFailed(1);
                                                                                    setIsReconnecting(false);
                                                                                    navigating.current = false;
                                                                                    return;
                                                                                }

                                                                                const device = await manager.connectToDevice(item.deviceId, {
                                                                                    autoConnect: false,
                                                                                    timeout: 10000,
                                                                                });

                                                                                await device.discoverAllServicesAndCharacteristics();

                                                                                unsubscribeRx();
                                                                                const res = await connectDevice(device);
                                                                                goDevice.current = item.id;

                                                                            } catch (error: any) {
                                                                                setFailed(2);
                                                                                setIsReconnecting(false);
                                                                                navigating.current = false;
                                                                            }
                                                                        }
                                                                    }
                                                                    if (connectedDevice) {
                                                                        router.push({pathname: '/device', params: {id: item.id}})
                                                                        setTimeout(() => setHidden(true), 100)
                                                                    }
                                                                    setIsReconnecting(false)
                                                                }}
                                                                variant="plain"
                                                            >
                                                                <View style={[{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    flexDirection: 'row',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    paddingHorizontal: 16
                                                                }, localStyles.deviceItemOuterOuter]}>
                                                                    <View style={localStyles.deviceItemDetails}>
                                                                        <Host matchContents>
                                                                            <Pod style={
                                                                                {alignSelf: "center"}
                                                                            } height={'90%'}/>
                                                                        </Host>

                                                                        <View style={localStyles.deviceItemStuff}>
                                                                            <View>
                                                                                <Text style={[localStyles.text, localStyles.headline]}>{item.name}</Text>
                                                                                <Text
                                                                                    style={[localStyles.text, localStyles.subheadline, localStyles.greyed]}>Acoustic Pod</Text>
                                                                            </View>

                                                                            <GlassView style={localStyles.hertzTag}>
                                                                                <IconSymbol size={28} color={'white'}
                                                                                            name="waveform.path"/>
                                                                                <Text style={[localStyles.text, localStyles.footnote]}>{(hidden || !item?.frequency || !hasAttempted) ? '-----' : `${toDisplay(item.frequency)}Hz`}</Text>
                                                                            </GlassView>
                                                                        </View>
                                                                    </View>
                                                                    <IconSymbol style={{}} size={30} name={'chevron.forward'}
                                                                                color={'white'}/>
                                                                </View>
                                                            </Button>
                                                        </Host>
                                                    </View>
                                                </GlassView>
                                            </View>
                                        </ContextMenu.Trigger>
                                    </ContextMenu>
                                </Host>
                            ))
                        }

                        <GlassView style={[localStyles.glassBox, localStyles.deviceItemOuterOuter]}
                                   tintColor={'rgba(50,50,50,.7)'} glassEffectStyle="clear">
                            <GlassView style={[localStyles.glassBoxBox, {
                                outlineWidth: 1,
                                outlineColor: 'rgba(255,255,255,0.5)'
                            }]} glassEffectStyle="clear" tintColor={'rgba(50,50,50,.5)'}>
                                <Pressable
                                    onPress={() => router.push('/pairing')}
                                    style={{ width: '100%', height: '100%' }}
                                >
                                    <Host style={{ width: '100%', height: '100%' }} hitSlop={0}>
                                        <Button
                                            label="Add Device"
                                            systemImage="plus"
                                            variant="plain"
                                            onPress={() => router.push('/pairing')}
                                            modifiers={[
                                                labelStyle('iconOnly'),
                                                font({ size: 48 }),
                                                foregroundStyle('white'),
                                                frame({ maxWidth: 10000, maxHeight: 10000 }),
                                                glassEffect({
                                                    glass: { variant: 'regular', interactive: true },
                                                    shape: 'rectangle',
                                                }),
                                            ]}
                                        />
                                    </Host>
                                </Pressable>
                            </GlassView>
                        </GlassView>
                    </View>
                </View>

                {
                    failed > 0 ? <View style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        paddingVertical: 84,
                        paddingHorizontal:24,
                        justifyContent: 'flex-end',
                        alignItems: 'center'
                    }}>
                        <GlassView
                            style={[localStyles.warningContainer]}
                            glassEffectStyle="clear"
                            glassEffectStyle="clear"
                            tintColor="rgba(50,50,50,.5)"
                        >
                            <IconSymbol size={40} color="#EAAC47" name="exclamationmark.triangle.fill"/>
                            <Text style={[localStyles.text, {
                                flexShrink: 1,
                                flexGrow: 1,
                                width: 0
                            }
                            ]}>
                                {failed === 1 ? "Please turn on your phone's bluetooth and try again." : 'Connection failed. Make sure the pod is switched on and that you are within 1m of it.'}
                            </Text>
                        </GlassView>
                    </View>: null
                }
            </ImageBackground>
        </View>
    );
}

const localStyles = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: "100%",
        paddingHorizontal: 16,
        paddingTop: 72,
        gap: 10
    },
    deviceItemStuff: {
        height: "100%",
        justifyContent: "space-between",
        flexDirection: 'column'
    },
    footnote: {
        fontSize: 13,
        fontWeight: "bold",
    },
    hertzTag: {
        paddingHorizontal: 8,
        paddingLeft: 6,
        paddingTop: 3,
        paddingBottom: 4,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: 12,
    },
    titleBox: {
        width: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
        alignItems: "center",
    },
    greyed: {
        color: "#C5C5C5",
    },
    subheadline: {
        fontSize: 15,
        fontWeight: "regular",
    },
    deviceItemDetails: {
        flexDirection: "row",
        height: "100%",
        gap: 24,
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
    deviceItemInner: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
    deviceItem: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    deviceItemOuterOuter: {
        padding: 12,
    },
    glassBox: {
        width: '100%',
        height: 106,
        borderRadius: 24,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    glassBoxBox: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    warningContainer: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 32,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        borderRadius: 24,
        width: '100%'
    },
    text: {
        color: "#fff",
    },
});