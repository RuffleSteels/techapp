import React, {useCallback, useEffect} from "react";
import {ImageBackground, StyleSheet, Text, View} from "react-native";
import {GlassView} from "expo-glass-effect";
import {styles} from "../../lib/theme";
// @ts-ignore
// import Pod from "@/assets/images/pod.svg"
import Pod from "../../assets/images/pod.svg";
import {Button, ContextMenu, Host} from '@expo/ui/swift-ui';
import manager from "../components/bleManager";

import {foregroundStyle, glassEffect, padding,} from "@expo/ui/swift-ui/modifiers";
import {useRouter} from "expo-router";
import {IconSymbol} from "../../lib/ui/icon-symbol";
import {loadData, saveData} from "../../lib/utils";
import {useFocusEffect} from '@react-navigation/native';
import {Device} from "../../lib/types";
import {useBLE} from "../../lib/BLEProvider";
import * as Haptics from "expo-haptics";



export default function HomeScreen() {
    const [hidden, setHidden] = React.useState(false);
    const router = useRouter();
    const {sendMessage, isReconnecting, setIsReconnecting, connectedDevice, lastDevice,hasBonded, hasTried, connectDevice, disconnectDevice, unsubscribeRx} = useBLE()
    const [hasAttempted, setHasAttempted] = React.useState(false)
    const [devices, setDevices] = React.useState<Device[]>([])
    const [devicesLoaded, setDevicesLoaded] = React.useState(false);
    const goDevice = React.useRef(-1)
    const [failed, setFailed] = React.useState(0)
    // const [isReconnecting, setIsReconnecting] = React.useState(false)

    useEffect(() => {
        if (goDevice.current > -1) {
            router.push({pathname: '/device', params: {id: goDevice.current}})
            setTimeout(() => setHidden(true), 100)
            goDevice.current = -1
        }
    }, [connectedDevice]);

    useFocusEffect(
        useCallback(() => {
            const init = async () => {
                const devices = await loadData('devices');
                if (devices) setDevices(devices);
                setHidden(false);
                setDevicesLoaded(true); // ✅ mark ready
            };
            init();
        }, [])
    );
    useFocusEffect(
        useCallback(() => {
            if (!devicesLoaded) return;

            const init = async () => {
                if (!hasTried) {
                    console.log("⏳ Waiting for BLE attempt...");
                    return; // exit for now — will rerun when connectedDevice changes
                }

                console.log("✅ BLE attempted:", connectedDevice?.name);

                if (devices) {
                    const connectedDeviceItem = devices.find(d => d.deviceId === connectedDevice?.id)


                    if (connectedDeviceItem) {
                        console.log('get')
                        const frequency = await sendMessage('GET_FREQ')
                        console.log(frequency, 'freq')
                        setDevices((prevDevices) => {
                            return prevDevices.map((d) =>
                                d.deviceId === connectedDevice.id
                                    ? { ...d, frequency: parseFloat(frequency) }
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
        console.log(devices)
         saveData('devices', devices)
    }, [devices]);

    useEffect(() => {
        console.log(hasBonded)
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
                            <Host style={{
                                width: 60,
                                height: '100%'
                            }}>

                                <Button
                                    role="default"
                                    variant="glassProminent"
                                    color={'rgba(0,0,0,0.6)'}

                                >
                                    <IconSymbol color={'white'} name="ellipsis"/>
                                </Button>
                            </Host>
                        </View>
                        <Text style={[localStyles.text, localStyles.headline]}>My Devices</Text>
                    </View>

                    <View style={{
                        gap: 16
                    }}>
                        {
                            devices.map((item, i) => (
                                <Host key={i} style={{
                                    // width: 60,
                                    // height: '100%'
                                }}>


                                    <ContextMenu activationMethod={'longPress'}>
                                        <ContextMenu.Items>
                                            <Button onPress={async () => {
                                                if (connectedDevice && connectedDevice.id === item.deviceId) {
                                                    disconnectDevice()
                                                }
                                                setDevices(prev => {
                                                    console.log(prev.filter(itemm => itemm.id !== parseInt(item.id)))
                                                    return prev.filter(itemm => itemm.id !== parseInt(item.id))
                                                })

                                                // router.back()
                                            }} role={'destructive'} modifiers={[
                                                foregroundStyle('red')
                                            ]} systemImage={'trash'}>
                                                Delete
                                            </Button>
                                        </ContextMenu.Items>
                                        <ContextMenu.Trigger>
                                            <View>
                                                {
                                                    !connectedDevice || item.deviceId !== connectedDevice?.id ?<View style={{
                                                        position: 'absolute',
                                                        width: '100%',
                                                        height: '100%',
                                                        zIndex: 10,
                                                        pointerEvents: 'none',
                                                        // backgroundColor: 'red',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Host>
                                                            <Button
                                                                onPress={() => {

                                                                }}
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
                                                                // color={'rgba(255,100,100,0.3)'}
                                                            >
                                                                <Text style={[localStyles.text, {
                                                                    paddingBottom: 12,
                                                                    paddingVertical: 4,
                                                                    paddingHorizontal: 8,
                                                                    paddingRight: 14,
                                                                    fontSize: 18,
                                                                    fontWeight: 600
                                                                }]}>
                                                                    {isReconnecting ? 'Connecting...' : 'Connect'}
                                                                </Text>

                                                            </Button>
                                                        </Host>
                                                    </View> : null
                                                }

                                                <GlassView key={i} style={[localStyles.glassBox,{
                                                    pointerEvents: !hasTried || isReconnecting ? 'none' : 'all',
                                                    opacity: !connectedDevice || item.deviceId !== connectedDevice?.id ? .3 : 1 //TODO pointer ecents none, bluetootgh disconnect on app unfocus
                                                }]} tintColor={'rgba(50,50,50,.7)'}
                                                           glassEffectStyle="clear">

                                                    <View style={[localStyles.glassBoxBox, {
                                                        // opacity
                                                    }]}>

                                                        <Host style={{
                                                            width: '100%',
                                                            height: '100%'
                                                        }}>
                                                            <Button
                                                                onPress={async () => {
                                                                    setFailed(false)
                                                                    if (!connectedDevice || item.deviceId !== connectedDevice?.id) {
                                                                        setIsReconnecting(true)
                                                                    }
                                                                    if (!connectedDevice || item.deviceId !== connectedDevice?.id) {
                                                                        if (connectedDevice) {
                                                                            await disconnectDevice()
                                                                        }
                                                                        if (!connectedDevice) {
                                                                            try {
                                                                                // Optional: cancel any previous pending BLE actions
                                                                                await manager.cancelDeviceConnection(item.deviceId).catch(() => {});

                                                                                // Ensure Bluetooth is powered on before connecting
                                                                                const state = await manager.state();
                                                                                if (state !== 'PoweredOn') {
                                                                                    console.warn("⚠️ Bluetooth is not powered on");
                                                                                    setFailed(1);
                                                                                    setIsReconnecting(false);
                                                                                    return;
                                                                                }

                                                                                console.log("🔌 Attempting to connect:", item.deviceId);

                                                                                const device = await manager.connectToDevice(item.deviceId, {
                                                                                    autoConnect: false, // important: avoid this on iOS
                                                                                    timeout: 10000, // optional timeout in ms
                                                                                });

                                                                                console.log("✅ Connected to:", device.name);

                                                                                // Discover services and characteristics
                                                                                await device.discoverAllServicesAndCharacteristics();

                                                                                unsubscribeRx();
                                                                                const res = await connectDevice(device);
                                                                                console.log(res);
                                                                                goDevice.current = item.id;

                                                                            } catch (error: any) {
                                                                                console.error("❌ Failed to connect:", error?.message || error);
                                                                                setFailed(2);
                                                                                setIsReconnecting(false);

                                                                                // optional — retry automatically
                                                                                // setTimeout(() => retryConnect(item.deviceId), 3000);
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
                                                                modifiers={[
                                                                    glassEffect({
                                                                        glass: {
                                                                            variant: 'identity',
                                                                            interactive: true,
                                                                        },
                                                                        shape: 'rectangle',
                                                                    }),
                                                                ]}
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
                                                                        <Pod style={
                                                                            {alignSelf: "center"}
                                                                        } height={'90%'}/>
                                                                        <View style={localStyles.deviceItemStuff}>
                                                                            <View>
                                                                                <Text style={[localStyles.text, localStyles.headline, {
                                                                                    // color: hidden ? '#afafaf' : 'white'
                                                                                }]}>{false ? '-'.repeat(item.name.length) : item.name}</Text>
                                                                                <Text
                                                                                    style={[localStyles.text, localStyles.subheadline, localStyles.greyed, {
                                                                                        // color: hidden ? '#afafaf' : 'white'
                                                                                    }]}>{false ? '------------' : 'Acoustic Pod'}</Text>
                                                                            </View>


                                                                            <GlassView style={localStyles.hertzTag}>
                                                                                <IconSymbol size={28} color={'white'}
                                                                                            name="waveform.path"/>
                                                                                <Text
                                                                                    style={[localStyles.text, localStyles.footnote]}>{hidden || !item?.frequency || !hasAttempted ? '-----' : item.frequency.toFixed(1)}Hz</Text>
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
                                <Host style={{
                                    width: '100%',
                                    height: '100%'
                                }}>
                                    <Button
                                        onPress={() => {
                                            router.push('/pairing')
                                        }}
                                        variant="plain"
                                        modifiers={[
                                            padding({
                                                // all: 18,
                                            }),
                                            glassEffect({
                                                glass: {
                                                    variant: 'identity',
                                                    interactive: true,
                                                },
                                                shape: 'rectangle',
                                            }),
                                        ]}
                                    >
                                        <View style={{
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%'
                                        }}>
                                            <IconSymbol size={50} color={'white'} name="plus"/>
                                        </View>

                                    </Button>
                                </Host>
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
                            tintColor="rgba(50,50,50,.5)"
                        >
                            <IconSymbol size={40} color="#EAAC47" name="exclamationmark.triangle.fill"/>
                            <Text style={[localStyles.text, {
                                flexShrink: 1,
                                flexGrow: 1,
                                width: 0
                            }
                            ]}>
                                {failed === 1 ? "Please turn on your phone's bluetooth and try again." : 'Connection failed. Make sure the pod is powered on and that you are within 1m of it.'}
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
        // paddingVertical:72
    },
    glassBox: {
        width: '100%',
        height: 106,
        borderRadius: 24,
        overflow: "hidden",
        alignItems: "center",
        // position: "absolute",
        justifyContent: "center",
        // backgroundColor: "rgba(0, 0, 0, 0,8)", // light translucent layer
    },
    glassBoxBox: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        overflow: "hidden",
        alignItems: "center",
        // position: "absolute",
        justifyContent: "center",
        // backgroundColor: "rgba(0, 0, 0, 0,8)", // light translucent layer
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

    text: {
        color: "#fff",
    },
});