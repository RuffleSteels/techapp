import React, {useEffect, useRef, useState} from "react";
import {Alert, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import * as Haptics from 'expo-haptics';
import {styles} from "../lib/theme";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import {Button, ContextMenu, Host} from '@expo/ui/swift-ui';

import {GlassView} from "expo-glass-effect";
import {foregroundStyle, glassEffect, padding} from "@expo/ui/swift-ui/modifiers";
import {useHeaderHeight} from '@react-navigation/elements';

// @ts-ignore
import Graph from "../assets/images/graph.svg"
import {IconSymbol} from "../lib/ui/icon-symbol";
import {loadData, saveData} from "../lib/utils";
import {Preset, Room} from "../lib/types";
import {useBLE} from "../lib/BLEProvider";


const presetss = [
    {
        name: 'Mid Reducer',
        frequency: 132.7,
        id: 0
    },
    {
        name: 'Vocal Clarity',
        frequency: 128.3,
        id: 1
    },
    {
        name: 'Guitar Recording',
        frequency: 100.8,
        id: 2
    }
]

const roomss = [
    {
        name: 'Home Studio',
        length: [2.5, 125.4],
        width: [3.5, 104.2],
        height: [2, 116.7],
        id: 0
    },
    {
        name: 'Recording Studio',
        length: [4.5, 100.4],
        width: [3.5, 104.2],
        height: [3, 195.7],
        id: 1
    },
    {
        name: 'Living Room',
        length: [1.5, 133.6],
        width: [3.7, 103.9],
        height: [1.5, 129.4],
        id: 2
    }
]


function findFirstMissingId(items: Preset[]): number {
    const ids = new Set(items.map(item => item.id));
    let i = 0;
    while (ids.has(i)) {
        i++;
    }
    return i;
}
interface RoomCardProps {
    item: Room;
    i: number;
    setCurrentId: React.Dispatch<React.SetStateAction<number>>;
    setCurrentMode: React.Dispatch<React.SetStateAction<number>>;
    setCurrentDimension: React.Dispatch<React.SetStateAction<any>>;
    showCreateModal: boolean;
    setSetFrequencyModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewFrequency: React.Dispatch<React.SetStateAction<string>>;
    currentMode: number;
    currentDimension: any;
    currentId: number;
    pendingRoomDimension: {id: number, dimension: number} | null;
    setPendingRoomDimension: React.Dispatch<React.SetStateAction<{id: number, dimension: number} | null>>;
    handleSetRoom: () => Promise<void>;
    pendingPreset:number | null;
}
function RoomCard({
                      item,
                      i,
                      setSetFrequencyModal,
                      setNewFrequency,
                      showCreateModal,
                      setCurrentId,
                      setCurrentMode,
                      currentDimension,
                      setCurrentDimension,
                      currentMode,
                      currentId,
                      pendingRoomDimension,
                      setPendingRoomDimension,
                      handleSetRoom,
                      pendingPreset
                  }: RoomCardProps) {

    const activeDim = pendingRoomDimension?.id === item.id
        ? pendingRoomDimension.dimension
        : currentDimension[item.id];

    return <GlassView
        style={[localStyles.glassBox, {width: '100%', height: 'auto', paddingHorizontal: 0, paddingVertical: 0}]}
        tintColor={
            pendingRoomDimension?.id === item.id
                ? 'rgba(80,80,80,.7)'
                : currentMode === 1 && item.id === currentId
                    ? 'rgba(161,172,184,0.68)'
                    : 'rgba(50,50,50,.7)'
        }
        glassEffectStyle="clear">
        <View style={{width: '100%'}}>
            <Host style={{width: '100%'}}>
                <Button
                    onPress={() => {
                        if (parseFloat(item.length[1]) && parseFloat(item.length[1]) < 0) return;

                        const currentDim = pendingRoomDimension?.id === item.id
                            ? pendingRoomDimension.dimension
                            : (currentDimension[item.id] ?? 0);

                        const dims = [item.length[1], item.width[1], item.height[1]];

                        if (pendingRoomDimension?.id === item.id || (item.id === currentId && currentMode === 1)) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            let next = currentDim;
                            for (let i = 1; i <= 3; i++) {
                                const candidate = (currentDim + i) % 3;
                                if (parseFloat(dims[candidate]) >= 0) {
                                    next = candidate;
                                    break;
                                }
                            }
                            setPendingRoomDimension({id: item.id, dimension: next});
                        } else {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPendingRoomDimension({id: item.id, dimension: currentDim});
                        }

                        setSetFrequencyModal(false);
                        setNewFrequency('');
                    }}
                    variant="plain"
                >
                    <View style={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: pendingRoomDimension?.id === item.id ? 4 : 12,
                        gap: 10,
                        borderRadius: 18,
                    }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Text style={[localStyles.text, localStyles.body, (currentMode === 1 && item.id === currentId || pendingRoomDimension?.id === item.id) && {fontWeight: '600'}]}>
                                {item.name}
                            </Text>
                        </View>

                        <View style={{flexDirection: 'row', gap: 24, justifyContent: 'space-between', alignItems: 'flex-end'}}>
                            <View style={{gap: 2}}>
                                <Text style={[localStyles.text, localStyles.footnote, {fontWeight: activeDim === 0 ? '800' : '300'}]}>
                                    Length: {item.length[0]}m — {parseFloat(item.length[1]) ? parseFloat(item.length[1]) < 0 ? 'N/A' : `${parseFloat(item.length[1]).toFixed(1)}Hz` : 0}
                                </Text>
                                <Text style={[localStyles.text, localStyles.footnote, {fontWeight: activeDim === 1 ? '800' : '300'}]}>
                                    Width: {item.width[0]}m — {parseFloat(item.width[1]) ? parseFloat(item.width[1]) < 0 ? 'N/A' : `${parseFloat(item.width[1]).toFixed(1)}Hz` : 0}
                                </Text>
                                <Text style={[localStyles.text, localStyles.footnote, {fontWeight: activeDim === 2 ? '800' : '300'}]}>
                                    Height: {item.height[0]}m — {parseFloat(item.height[1]) ? parseFloat(item.height[1]) < 0 ? 'N/A' : `${parseFloat(item.height[1]).toFixed(1)}Hz` : 0}
                                </Text>
                            </View>

                            <View style={{flexGrow: 1, position: 'relative'}}>
                                <Graph preserveAspectRatio="none" width={'100%'}/>
                                {pendingRoomDimension?.id === item.id && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                    }}>
                                        <Host>
                                            <Button
                                                onPress={handleSetRoom}
                                                variant="plain"
                                                modifiers={[
                                                    glassEffect({
                                                        glass: {variant: 'regular', interactive: true},
                                                        shape: 'capsule'
                                                    }),
                                                ]}
                                            >
                                                <Text style={[localStyles.text, localStyles.footnote, {
                                                    paddingVertical: 6,
                                                    paddingHorizontal: 14,
                                                    fontWeight: '600',
                                                }]}>
                                                    Set
                                                </Text>
                                            </Button>
                                        </Host>
                                    </View>
                                )}
                                {pendingRoomDimension?.id === item.id && (
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                    }}>
                                        <Host>
                                            <Button
                                                onPress={() => setPendingRoomDimension(null)}
                                                variant="plain"
                                                modifiers={[
                                                    glassEffect({
                                                        glass: {variant: 'regular', interactive: true},
                                                        shape: 'capsule'
                                                    }),
                                                ]}
                                            >
                                                <Text style={[localStyles.text, localStyles.footnote, {
                                                    paddingVertical: 6,
                                                    paddingHorizontal: 14,
                                                    fontWeight: '600',
                                                }]}>
                                                    Cancel
                                                </Text>
                                            </Button>
                                        </Host>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </Button>
            </Host>
        </View>
    </GlassView>
}

function toWords(num: number): string {
    switch (num) {
        case 0:
            return 'length'
        case 1:
            return 'width'
        case 2:
            return 'height'
    }
    return ''
}


export default function Pairing() {
    const {id} = useLocalSearchParams();
    const router = useRouter();
    const previousSelection = useRef<{id: number, mode: number} | null>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [deviceName, setDeviceName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const hasMismatch = useRef(false); // ← add this
    const [movingOverlay, setMovingOverlay] = useState<{visible: boolean, freq: number, status: 'moving' | 'success' | 'error' | 'oor'}>({
        visible: false, freq: 0, status: 'moving'
    });
    const [renameRoomModal, setRenameRoomModal] = useState<{visible: boolean, id: number, name: string}>({
        visible: false, id: -1, name: ''
    });
    const {sendMessage, connectedDevice: cd} = useBLE();
    const [pendingPreset, setPendingPreset] = useState<number | null>(null);
    const [currentFrequency, _setCurrentFrequency] = useState(0);
    const [currentMode, setCurrentMode] = useState(-1);
    const [currentId, setCurrentId] = useState(-1);
    const [currentDimension, setCurrentDimension] = useState(
        Object.fromEntries(
            roomss.map(room => [room.id, 0]) // 0 = length
        )
    );
    const hasLoaded = useRef(false);
    const isInitialSync = useRef(true); // ← add this
    const [pendingRoomDimension, setPendingRoomDimension] = useState<{id: number, dimension: number} | null>(null);
    const setCurrentFrequency = async (newFreq: number, isFirst: boolean): Promise<boolean> => {
        if (isFirst || currentFrequency === newFreq) {
            _setCurrentFrequency(newFreq);
            return true;
        }

        setMovingOverlay({ visible: true, freq: newFreq, status: 'moving' });

        try {
            const response = await sendMessage(`SET_FREQ:${newFreq}`);

            if (response === 'OK') {
                _setCurrentFrequency(newFreq);
                setMovingOverlay(prev => ({ ...prev, status: 'success' }));
                setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 1500);
                return true;
            } else if (response === 'OOR') {
                setMovingOverlay(prev => ({ ...prev, status: 'oor' }));
                setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 2000);
                return false;
            } else if (response === 'ERR') {
                setMovingOverlay(prev => ({ ...prev, status: 'error' }));
                setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 2000);
                return false;
            } else {
                // null = timeout or no response — close quietly, don't show error
                setMovingOverlay(prev => ({ ...prev, visible: false }));
                return false;
            }
        } catch (e) {
            setMovingOverlay(prev => ({ ...prev, status: 'error' }));
            setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 2000);
            return false;
        }
    };

    useEffect(() => {
        const init = async () => {
            hasMismatch.current = false; // ← reset on each load
            isInitialSync.current = true;

            let storedDevices = (await loadData('devices'))
                || [{
                id: 0,
                currentId: -1,
                currentMode: -1,
                name: 'Den',
                frequency: 100
            }];
            const storedRooms = (await loadData('rooms')) || roomss;
            const storedPresets = (await loadData('presets')) || presetss;
            const index = parseInt(id as string);

            const freq = await sendMessage('GET_FREQ')
            console.log(freq, 'ee')
            if (freq && parseFloat(freq)) {
                console.log('okay')
                const originalFreq = storedDevices[index]?.frequency; // ← save BEFORE the map

                const selectedFreq = (() => {
                    const savedId = storedDevices[index]?.currentId;
                    const savedMode = storedDevices[index]?.currentMode;

                    if (savedId < 0 || savedMode < 0) return null;

                    if (savedMode === 0) {
                        // preset
                        const preset = storedPresets.find(p => p.id === savedId);
                        return preset ? preset.frequency : null;
                    } else if (savedMode === 1) {
                        // room
                        const room = storedRooms.find(r => r.id === savedId);
                        const savedDimension = storedDevices[index]?.currentDimension?.[savedId] ?? 0;
                        const dimKey = toWords(savedDimension) as keyof Room;
                        const dimValue = room?.[dimKey];
                        return Array.isArray(dimValue) ? dimValue[1] : null;
                    }
                    return null;
                })();

                if (
                    parseFloat(freq).toFixed(1) !== originalFreq?.toFixed(1) ||
                    (selectedFreq !== null && parseFloat(freq).toFixed(1) !== parseFloat(selectedFreq).toFixed(1))
                ) {
                    console.log('mismatch detected', parseFloat(freq).toFixed(1), 'vs', originalFreq?.toFixed(1), 'selected freq was', selectedFreq)
                    hasMismatch.current = true;
                }

                storedDevices = storedDevices.map((d, i) =>  // ← map happens AFTER
                    d.deviceId === cd.id
                        ? {
                            ...d,
                            frequency: parseFloat(freq),
                            ...(hasMismatch.current ? {currentId: -1, currentMode: -1} : {}),
                        }
                        : d
                );
            }


            setDevices(storedDevices);
            setRooms(storedRooms);
            setPresets(storedPresets);


            if (!isNaN(index) && storedDevices[index]) {
                setDeviceName(storedDevices[index]?.name ?? '');

                if (hasMismatch.current) {
                    setCurrentId(-1);
                    setCurrentMode(-1);
                } else {
                    setCurrentId(storedDevices[index]?.currentId ?? -1);
                    setCurrentMode(storedDevices[index]?.currentMode ?? -1);
                }

                _setCurrentFrequency(storedDevices[index]?.frequency ?? 0);
                setCurrentDimension(storedDevices[index]?.currentDimension ?? {});
                setDeviceId(storedDevices[index]?.deviceId ?? '');
            } else {
                setDeviceName('');
                setCurrentFrequency(0, true);
                setCurrentId(-1);
                setCurrentMode(-1);
            }

            hasLoaded.current = true;
            setTimeout(() => { isInitialSync.current = false; }, 0); // ← let the render cycle finish first

        };

        init();
    }, [id]);
    useEffect(() => {
        if (!hasLoaded.current || isInitialSync.current) return;
        const preset = presets.find((item) => item.id === currentId);

        if (currentId < 0 || currentMode < 0) return;

        if (currentMode === 0) {
            if (preset) {
                setCurrentFrequency(preset?.frequency ?? 0);
            }
        }
        // rooms are handled by the Set button now, not here

    }, [currentId, currentMode, presets]);
    const handleSetRoom = async () => {
        if (pendingRoomDimension === null) return;

        const room = rooms.find(r => r.id === pendingRoomDimension.id);
        if (!room) return;

        const dimKey = toWords(pendingRoomDimension.dimension) as keyof Room;
        const dimValue = room[dimKey];
        const freq = Array.isArray(dimValue) ? dimValue[1] : 0;

        // Save current selection before attempting
        previousSelection.current = { id: currentId, mode: currentMode };

        const success = await setCurrentFrequency(freq, false);

        if (success) {
            setCurrentId(pendingRoomDimension.id);
            setCurrentMode(1);
            setCurrentDimension(prev => ({ ...prev, [pendingRoomDimension.id]: pendingRoomDimension.dimension }));
            setPendingRoomDimension(null);
        } else {
            // Restore previous selection on failure
            setCurrentId(previousSelection.current?.id ?? -1);
            setCurrentMode(previousSelection.current?.mode ?? -1);
            setPendingRoomDimension(null);
        }
    };
    // ✅ Only save after initial load
    useEffect(() => {
        if (hasLoaded.current) saveData('presets', presets);
    }, [presets]);

    useEffect(() => {
        if (hasLoaded.current) saveData('rooms', rooms);
    }, [rooms]);

    useEffect(() => {
        if (hasLoaded.current) saveData('devices', devices);
    }, [devices]);

    useEffect(() => {
        if (hasLoaded.current) {
            if (!id) return;

            const parsedId = parseInt(id as string);
            if (isNaN(parsedId)) return;

            setDevices(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.map(item =>
                    item.id === parsedId ? {...item, name: deviceName} : item
                );
            });
        }
    }, [deviceName, id]);

    useEffect(() => {
        if (hasLoaded.current) {
            if (!id) return;

            const parsedId = parseInt(id as string);
            if (isNaN(parsedId)) return;

            setDevices(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.map(item =>
                    item.id === parsedId ? {...item, frequency: currentFrequency} : item
                );
            });
        }
    }, [currentFrequency, id]);


    useEffect(() => {
        if (hasLoaded.current) {
            if (!id) return;

            const parsedId = parseInt(id as string);
            if (isNaN(parsedId)) return;

            setDevices(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.map(item =>
                    item.id === parsedId ? {...item, currentMode: currentMode} : item
                );
            });
        }
    }, [currentMode, id]);

    useEffect(() => {
        if (hasLoaded.current) {
            if (!id) return;

            const parsedId = parseInt(id as string);
            if (isNaN(parsedId)) return;

            setDevices(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.map(item =>
                    item.id === parsedId ? {...item, currentId: currentId} : item
                );
            });
        }
    }, [currentId, id]);

    useEffect(() => {
        if (hasLoaded.current) {
            if (!id) return;

            const parsedId = parseInt(id as string);
            if (isNaN(parsedId)) return;

            setDevices(prev => {
                if (!Array.isArray(prev)) return [];
                return prev.map(item =>
                    item.id === parsedId ? {...item, currentDimension: currentDimension} : item
                );
            });
        }
    }, [currentDimension, id]);
    const { disconnectDevice, connectedDevice } = useBLE();

    useEffect(() => {
        if (!hasLoaded.current || isInitialSync.current) return;
        if (pendingPreset === null) return;

        const run = async () => {
            const preset = presets.find(p => p.id === pendingPreset);
            if (!preset) return;

            const success = await setCurrentFrequency(preset.frequency, false);

            if (success) {
                setCurrentId(pendingPreset);
                setCurrentMode(0);
            }
            // on failure, currentId/currentMode remain unchanged
            setPendingPreset(null);
        };

        run();
    }, [pendingPreset]);
    const [editModal, setEditModal] = useState(-1);
    const [presetPopupWindow, setPresetPopupWindow] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetFreq, setNewPresetFreq] = useState('');
    const [setFrequencyModal, setSetFrequencyModal] = useState(false);
    const [newFrequency, setNewFrequency] = useState('');
    useEffect(() => {
        if (!connectedDevice) {
            console.log("⚠️ Disconnected — returning to main screen");
            router.back();
        }
    }, [connectedDevice]);useEffect(() => {
        if (!hasLoaded.current || isInitialSync.current) return;
        const preset = presets.find((item) => item.id === currentId);
        const room = rooms.find((item) => item.id === currentId);

        if (currentId < 0 || currentMode < 0) return;

        if (currentMode === 0) {
            if (preset) {
                setCurrentFrequency(preset?.frequency ?? 0);
            }
        } else if (currentMode === 1) {
            if (room) {
                const dimKey = toWords(currentDimension[currentId]) as keyof Room;
                const dimValue = room?.[dimKey];

                if (Array.isArray(dimValue)) {
                    setCurrentFrequency(dimValue[1] ?? 0);
                } else {
                    setCurrentFrequency(0);
                }
            }
        }

    }, [currentId, currentMode, currentDimension, presets, rooms]);
    const headerHeight = useHeaderHeight();


    const [newDeviceName, setNewDeviceName] = useState(deviceName)
    const [deviceNameEdit, setDeviceNameEdit] = useState(false)

    return (
        <>
            <View
                style={{
                    position: 'absolute',
                    top: headerHeight - 58,
                    left: 80,
                    right: 0,
                    zIndex: 2000,
                    alignItems: 'center',
                }}
            >
                <View style={[localStyles.titleBox]}>
                    {
                        deviceNameEdit ? <TextInput
                            placeholder="Enter Name"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={newDeviceName}
                            autoFocus={true}
                            inputMode={'text'}
                            onChangeText={setNewDeviceName}
                            style={[{
                                color: 'white',
                                width: 140,
                                borderRadius: 12,
                                padding: 4,
                                paddingHorizontal: 8,
                                backgroundColor: 'rgba(40,40,40,0.8)',
                                // marginBottom: 6,
                                borderBottomColor: 'white',
                                borderBottomWidth: 2
                            }, localStyles.text, localStyles.largeTitle]}
                        /> : <><Text
                            style={[localStyles.text, localStyles.largeTitle, {marginBottom: -4}]}>{deviceName}</Text>
                            <Text style={[localStyles.text, localStyles.footnote]}>Acoustic Pod</Text>
                        </>
                    }


                </View>
            </View>

            <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{paddingTop: 0}}>
                <View style={styles.container}>

                    <ImageBackground
                        source={require("../assets/images/gradient.png")}
                        style={[styles.background, {}]}
                        // @ts-ignore
                        imageStyle={[{
                            top: -500,
                            filter: 'brightness(0.2)',
                            height: '250%'
                        }]}
                        resizeMode="cover"
                    >

                        <View style={localStyles.wrapper}>
                            <Stack.Screen options={{
                                headerTransparent: true,
                                headerBlurEffect: 'none',
                                headerTitleStyle: {
                                    color: 'transparent',

                                },
                                headerBackButtonMenuEnabled: false,
                                headerLargeStyle: {backgroundColor: "transparent"},
                                headerBackButtonDisplayMode: 'minimal',
                                title: 'W',

                                headerRight: () => (
                                    deviceNameEdit ? <View style={{flexDirection: 'row', gap: 12}}>
                                            <Host><Button onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

                                                setDeviceNameEdit(false)
                                                setNewDeviceName(deviceName)
                                            }}>
                                                <View style={{
                                                    backgroundColor: 'rgba(100,100,100,0.3)',
                                                    paddingHorizontal: 12,
                                                    alignSelf: 'center',
                                                    borderRadius: 18,
                                                }}>
                                                    <Text style={[localStyles.text, localStyles.body, {
                                                        paddingVertical: 8,
                                                    }]}>
                                                        Cancel
                                                    </Text>
                                                </View>

                                            </Button>

                                            </Host>
                                            <Host>
                                                <Button onPress={() => {
                                                    if (!newDeviceName) {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        return
                                                    }
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                                                    setDeviceName(newDeviceName)

                                                    setDeviceNameEdit(false)
                                                }} variant={'plain'}>
                                                    <View style={{
                                                        backgroundColor: 'rgba(100,100,100,0.3)',
                                                        paddingHorizontal: 12,
                                                        alignSelf: 'center',
                                                        borderRadius: 18,
                                                    }}>
                                                        <Text style={[localStyles.text, localStyles.body, {
                                                            paddingVertical: 8,
                                                        }]}>
                                                            Set
                                                        </Text>
                                                    </View>
                                                </Button>

                                            </Host>

                                        </View> :
                                        <Host style={{
                                            width: 60,
                                            height: '100%'
                                        }}>


                                            <ContextMenu>
                                                <ContextMenu.Items>
                                                    {/*<Button onPress={() => {*/}
                                                    {/*    setDeviceNameEdit(true)*/}
                                                    {/*}} systemImage={'pencil'}>*/}
                                                    {/*    Rename*/}
                                                    {/*</Button>*/}
                                                    <Button onPress={async () => {
                                                        if (connectedDevice && connectedDevice.id === deviceId) {
                                                            disconnectDevice()
                                                        }
                                                        setDevices(prev => {
                                                            return prev.filter(item => item.id !== parseInt(id))
                                                        })
                                                        await saveData('devices', devices)

                                                        setCurrentId(-1)
                                                        // router.back()
                                                    }} role={'destructive'} modifiers={[
                                                        foregroundStyle('red')
                                                    ]} systemImage={'trash'}>
                                                        Delete
                                                    </Button>
                                                </ContextMenu.Items>
                                                <ContextMenu.Trigger>
                                                    <IconSymbol color={'white'} size={13} name="ellipsis"/>
                                                </ContextMenu.Trigger>
                                            </ContextMenu>

                                        </Host>
                                )


                            }}/>
                            <View style={{gap: 24, paddingBottom: 16}}>
                                <View style={{
                                    backgroundColor: 'rgba(0,0,0,0.44)',
                                    position: 'absolute',
                                    width: '200%',
                                    height: 1000,
                                    bottom: 0,
                                    alignSelf: 'center'
                                }}>
                                </View>

                                <View>
                                    <Text style={[localStyles.text, localStyles.footnote]}>
                                        Current Frequency
                                    </Text>
                                    <View style={{
                                        width: '100%',
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        {
                                            setFrequencyModal ? (
                                                <View style={{marginRight: 32, flexDirection: 'row'}}>
                                                    <TextInput
                                                        placeholder="9"
                                                        placeholderTextColor="transparent"
                                                        value={newFrequency}
                                                        autoFocus={true}
                                                        inputMode={'decimal'}
                                                        maxLength={5}
                                                        onChangeText={(text) => {
                                                            // Allow only digits and at most one "."
                                                            if (/^[0-9]*\.?[0-9]*$/.test(text)) {
                                                                setNewFrequency(text);
                                                            }
                                                        }}
                                                        style={{
                                                            color: 'white',
                                                            flexShrink: 1,
                                                            fontSize: 36,
                                                            fontWeight: '800',
                                                            marginRight: 8,
                                                            borderBottomColor: 'white',
                                                            borderBottomWidth: 3
                                                        }}
                                                    />
                                                    <Text style={[localStyles.text, {
                                                        fontSize: 36,
                                                        fontWeight: '800'
                                                    }]}>Hz</Text>
                                                </View>
                                            ) : (
                                                <Text style={[localStyles.text, {fontSize: 36, fontWeight: '800'}]}>
                                                    {currentFrequency ? currentFrequency.toFixed(1) : ''}Hz
                                                </Text>
                                            )
                                        }

                                        {
                                            setFrequencyModal ? <View style={{flexDirection: 'row', gap: 12}}>
                                                <Host>
                                                    <Button
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

                                                            setSetFrequencyModal(false)
                                                            setNewFrequency('')
                                                        }}
                                                        role="default"
                                                        variant="plain"
                                                        modifiers={[
                                                            padding({
                                                                all: 4,
                                                            }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: 'regular',
                                                                    interactive: true,
                                                                },
                                                                shape: 'capsule'
                                                            }),
                                                        ]}
                                                        color={'rgba(100,100,100,0.3)'}
                                                    >
                                                        <Text style={[localStyles.text, localStyles.body, {
                                                            paddingBottom: 12,
                                                            paddingVertical: 4,
                                                            paddingHorizontal: 8,
                                                            paddingRight: 14
                                                        }]}>
                                                            Cancel
                                                        </Text>

                                                    </Button>
                                                </Host>
                                                <Host>
                                                    <Button
                                                        onPress={() => {
                                                            if (!newFrequency) {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                return
                                                            }
                                                            if (newFrequency && (parseFloat(newFrequency) < 100.0 || parseFloat(newFrequency) > 140.0)) {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                                                Alert.alert('Out of range', 'Please enter a frequency between 100 and 140 Hz')
                                                            } else {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                                                                setCurrentFrequency(parseFloat(newFrequency))
                                                                setNewFrequency('')
                                                                setSetFrequencyModal(false)
                                                                setCurrentId(-1)
                                                            }

                                                        }}
                                                        role="default"
                                                        variant="plain"
                                                        modifiers={[
                                                            padding({
                                                                all: 4,
                                                            }),
                                                            glassEffect({
                                                                glass: {
                                                                    variant: 'regular',
                                                                    interactive: true,
                                                                },
                                                                shape: 'capsule'
                                                            }),
                                                        ]}
                                                        color={'rgba(100,100,100,0.3)'}
                                                    >
                                                        <Text style={[localStyles.text, localStyles.body, {
                                                            paddingBottom: 12,
                                                            paddingVertical: 4,
                                                            paddingHorizontal: 8,
                                                            paddingRight: 14
                                                        }]}>
                                                            Set
                                                        </Text>

                                                    </Button>
                                                </Host>
                                            </View> : null
                                        }


                                        {
                                            setFrequencyModal ? null : <Host>
                                                <Button
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                                        setSetFrequencyModal(true)
                                                    }}
                                                    role="default"
                                                    variant="plain"
                                                    modifiers={[
                                                        padding({
                                                            all: 4,
                                                        }),
                                                        glassEffect({
                                                            glass: {
                                                                variant: 'regular',
                                                                interactive: true,
                                                            },
                                                            shape: 'capsule'
                                                        }),
                                                    ]}
                                                    color={'rgba(100,100,100,0.3)'}
                                                >
                                                    <Text style={[localStyles.text, localStyles.body, {
                                                        paddingBottom: 12,
                                                        paddingVertical: 4,
                                                        paddingHorizontal: 8,
                                                        paddingRight: 14
                                                    }]}>
                                                        Change
                                                    </Text>

                                                </Button>
                                            </Host>
                                        }

                                    </View>
                                </View>
                            </View>

                            <View style={{gap: 32}}>
                                <View style={{gap: 12}}>
                                    <View style={{
                                        flexDirection: 'row',
                                        width: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Text style={[localStyles.text, localStyles.headline]}>
                                            Presets
                                        </Text>
                                        <View style={{flexDirection: 'row', gap: 10}}>
                                            <Host>
                                                <ContextMenu>
                                                    <ContextMenu.Items>
                                                        <Button onPress={() => {
                                                            setPresetPopupWindow(0)
                                                            setShowCreateModal(true)

                                                        }}
                                                                systemImage={'plus.circle'}>
                                                            Create from current frequency
                                                        </Button>
                                                        <Button onPress={() => {
                                                            setPresetPopupWindow(1)
                                                            setShowCreateModal(true)

                                                        }} systemImage={'plus.circle'}>
                                                            Create new
                                                        </Button>
                                                    </ContextMenu.Items>
                                                    <ContextMenu.Trigger>
                                                        <Button
                                                            onPress={() => {
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                                            }}
                                                            // onPress={()=>Alert.alert('Changing')}
                                                            role="default"
                                                            variant="plain"
                                                            modifiers={[
                                                                padding({
                                                                    all: 4,
                                                                }),
                                                                glassEffect({
                                                                    glass: {
                                                                        variant: 'regular',
                                                                        interactive: true,
                                                                    },
                                                                }),
                                                            ]}
                                                            color={'rgba(100,100,100,0.3)'}
                                                        >
                                                            <IconSymbol style={{
                                                                textAlign: 'center',
                                                                bottom: 0
                                                            }} size={30} name="plus" color="white"/>

                                                        </Button>
                                                    </ContextMenu.Trigger>
                                                </ContextMenu>
                                            </Host>
                                        </View>
                                    </View>
                                    <View style={{marginHorizontal: -16, overflow: 'visible'}}>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={{overflow: 'visible'}}
                                            contentContainerStyle={{
                                                overflow: 'visible',
                                                gap: 10,
                                                paddingHorizontal: 16
                                            }}>
                                            {presets.map((item, i) => (
                                                <Host matchContents key={item.id}>
                                                    <ContextMenu activationMethod={'longPress'}>
                                                        <ContextMenu.Items>
                                                            <Button onPress={() => {
                                                                setEditModal(item.id)
                                                                setNewPresetName(item.name)
                                                                setNewPresetFreq(item.frequency.toFixed(1))
                                                                setShowCreateModal(true)
                                                                setPresetPopupWindow(1)
                                                            }} systemImage={'pencil'}>
                                                                Edit
                                                            </Button>
                                                            <Button onPress={() => {
                                                                setPresets(prev => {
                                                                    const newPresets = prev.filter(x => x.id !== item.id);
                                                                    if (currentMode === 0) {
                                                                        if (currentId === item.id && newPresets.length === 0) {
                                                                            setCurrentId(-1)
                                                                        } else if (currentId === item.id) {
                                                                            setCurrentId(newPresets[0].id)
                                                                        } else {
                                                                            setCurrentId(currentId)
                                                                        }
                                                                    }

                                                                    return newPresets;
                                                                });

                                                                setCurrentFrequency(currentFrequency)


                                                            }} role={'destructive'} systemImage={'trash'}>
                                                                Delete
                                                            </Button>
                                                        </ContextMenu.Items>
                                                        <ContextMenu.Trigger>
                                                            <GlassView key={i} style={[localStyles.glassBox, {
                                                                width: 'auto',
                                                                height: 'auto',
                                                                paddingHorizontal: 0,
                                                                paddingVertical: 0
                                                            }]}
                                                                       tintColor={currentMode === 0 && item.id === currentId ? 'rgba(161,172,184,0.68)' : 'rgba(50,50,50,.7)'}
                                                                       glassEffectStyle="clear">
                                                                <View style={[{
                                                                    // height:'100%'
                                                                }]}>
                                                                    <Host style={{
                                                                        width: '100%',
                                                                        // height: '100%'
                                                                    }}>
                                                                        <Button
                                                                            onPress={() => {
                                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                                setPendingPreset(item.id);
                                                                                setSetFrequencyModal(false);
                                                                                setNewFrequency('');
                                                                                setPendingRoomDimension(null);
                                                                            }}
                                                                            variant="plain"
                                                                            modifiers={[
                                                                                // glassEffect({
                                                                                //     glass: {
                                                                                //         variant: 'regular',
                                                                                //         interactive: !showCreateModal,
                                                                                //     },
                                                                                //     shape: 'rectangle',
                                                                                // }),
                                                                            ]}
                                                                        >
                                                                            <View style={[{
                                                                                paddingHorizontal: 16,
                                                                                paddingVertical: 12,
                                                                                gap: 8,
                                                                                // height: '100%',
                                                                                justifyContent: 'space-between'
                                                                            }]}>
                                                                                <Text
                                                                                    style={[localStyles.text, localStyles.body, currentMode === 0 && item.id === currentId && {fontWeight: '400'}]}>
                                                                                    {item.name}
                                                                                </Text>
                                                                                <View style={{
                                                                                    flexDirection: 'row',
                                                                                    gap: 4,
                                                                                    alignItems: 'center'
                                                                                }}>
                                                                                    <IconSymbol style={{marginLeft: -3}}
                                                                                                name="waveform.path"
                                                                                                color={currentMode === 0 && item.id === currentId ? '#d1d1d1' : '#afafaf'}/>
                                                                                    <Text
                                                                                        style={[localStyles.text, localStyles.subheadline, {color: currentMode === 0 && item.id === currentId ? '#d1d1d1' : '#afafaf'}]}>{item.frequency ? item.frequency.toFixed(1) : ''}Hz</Text>
                                                                                </View>
                                                                            </View>

                                                                        </Button>
                                                                    </Host>
                                                                </View>
                                                            </GlassView>
                                                        </ContextMenu.Trigger>
                                                    </ContextMenu>
                                                </Host>


                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>

                                <View style={{gap: 12}}>
                                    <View style={{

                                        flexDirection: 'row',
                                        width: '100%',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <Text style={[localStyles.text, localStyles.headline]}>
                                            Rooms
                                        </Text>
                                        {/*<View style={{flexDirection: 'row', gap: 10}}>*/}
                                            {/*<Host>*/}
                                            {/*    <Button*/}
                                            {/*        onPress={() => {*/}
                                            {/*            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);*/}

                                            {/*            router.push('/(tabs)/spaces')*/}
                                            {/*        }}*/}
                                            {/*        role="default"*/}
                                            {/*        variant="plain"*/}
                                            {/*        modifiers={[*/}
                                            {/*            padding({*/}
                                            {/*                all: 4,*/}
                                            {/*            }),*/}
                                            {/*            glassEffect({*/}
                                            {/*                glass: {*/}
                                            {/*                    variant: 'regular',*/}
                                            {/*                    interactive: true,*/}
                                            {/*                }*/}
                                            {/*            }),*/}
                                            {/*        ]}*/}
                                            {/*        color={'rgba(100,100,100,0.3)'}*/}
                                            {/*    >*/}
                                            {/*        <IconSymbol style={{*/}
                                            {/*            textAlign: 'center',*/}
                                            {/*            bottom: 0*/}
                                            {/*        }} size={30} name="plus" color="white"/>*/}

                                            {/*    </Button>*/}
                                            {/*</Host>*/}
                                        {/*</View>*/}
                                    </View>
                                    <View
                                        style={{gap: 16}}
                                    >
                                        {rooms.map((item, i) => (
                                            <Host matchContents key={item.id}>
                                                <ContextMenu activationMethod={'longPress'}>
                                                    <ContextMenu.Items>
                                                        <Button onPress={() => {
                                                            setRenameRoomModal({ visible: true, id: item.id, name: item.name });
                                                        }} systemImage={'pencil'}>
                                                            Rename
                                                        </Button>
                                                        <Button onPress={() => {
                                                            setRooms(prev => {
                                                                const newRooms = prev.filter(x => x.id !== item.id);
                                                                if (currentMode === 1) {
                                                                    if (currentId === item.id && newRooms.length === 0) {
                                                                        setCurrentId(-1)
                                                                    } else if (currentId === item.id) {
                                                                        setCurrentId(newRooms[0].id)
                                                                    } else {
                                                                        setCurrentId(currentId)
                                                                    }
                                                                }

                                                                return newRooms;
                                                            });


                                                        }} role={'destructive'} systemImage={'trash'}>
                                                            Delete
                                                        </Button>
                                                    </ContextMenu.Items>
                                                    <ContextMenu.Trigger>
                                                        <RoomCard
                                                            setSetFrequencyModal={setSetFrequencyModal}
                                                            setNewFrequency={setNewFrequency}
                                                            currentDimension={currentDimension}
                                                            showCreateModal={showCreateModal}
                                                            key={i}
                                                            currentId={currentId}
                                                            currentMode={currentMode}
                                                            item={item}
                                                            i={i}
                                                            setCurrentMode={setCurrentMode}
                                                            setCurrentId={setCurrentId}
                                                            setCurrentDimension={setCurrentDimension}
                                                            pendingRoomDimension={pendingRoomDimension}
                                                            setPendingRoomDimension={setPendingRoomDimension}
                                                            handleSetRoom={handleSetRoom}
                                                            pendingPreset={pendingPreset}
                                                        />
                                                    </ContextMenu.Trigger>
                                                </ContextMenu>
                                            </Host>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ImageBackground>
                </View>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={showCreateModal}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingBottom: 200,
                        width: '100%'
                    }}
                    onPress={() => {
                        setShowCreateModal(false)
                        setNewPresetName('')
                        setNewPresetFreq('')
                    }} // tap outside to close
                >
                    <Pressable
                        style={{
                            width: '100%'
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <GlassView
                            style={{
                                width: '80%',
                                alignSelf: 'center',
                                padding: 24,
                                borderRadius: 24,
                                gap: 16,

                            }}
                            tintColor="rgba(50,50,50,0.7)"
                            glassEffectStyle="regular"
                        >
                            <Text style={[localStyles.text, localStyles.headline]}>
                                Create New Preset
                            </Text>

                            {
                                presetPopupWindow === 0 ? (
                                    <Text style={[localStyles.text, localStyles.footnote]}>
                                        Frequency: {currentFrequency ? currentFrequency.toFixed(1) : ''}Hz
                                    </Text>
                                ) : null
                            }
                            <View style={{width: '100%', gap: 12}}>
                                {
                                    presetPopupWindow === 1 ? (
                                        <TextInput
                                            placeholder="Frequency"
                                            placeholderTextColor="#aaa"
                                            value={newPresetFreq}
                                            autoFocus={true}
                                            inputMode={'decimal'}
                                            maxLength={5}
                                            onChangeText={(text) => {
                                                // Allow only digits and at most one "."
                                                if (/^[0-9]*\.?[0-9]*$/.test(text)) {
                                                    setNewPresetFreq(text);
                                                }
                                            }}
                                            style={{
                                                backgroundColor: 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                borderRadius: 12,
                                                width: '100%',
                                                padding: 10,
                                                fontSize: 16,
                                            }}
                                        />) : null
                                }
                                <TextInput
                                    placeholder="Preset name"
                                    placeholderTextColor="#aaa"
                                    value={newPresetName}
                                    autoFocus={presetPopupWindow === 0}
                                    inputMode={'text'}
                                    maxLength={15}

                                    onChangeText={setNewPresetName}
                                    style={{
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        borderRadius: 12,
                                        width: '100%',
                                        padding: 10,
                                        fontSize: 16,
                                    }}
                                />
                            </View>
                            <Host matchContents>
                                <Button color={'white'} onPress={() => {
                                    if (newPresetFreq && newPresetName && (parseFloat(newPresetFreq) < 100.0 || parseFloat(newPresetFreq) > 140.0)) {
                                        Alert.alert('Out of range', 'Please enter a frequency between 100 and 140 Hz')
                                    }
                                    if (editModal < 0) {
                                        if (presetPopupWindow === 0) {
                                            setPresets(prev => [
                                                ...prev,
                                                {
                                                    name: newPresetName,
                                                    frequency: currentFrequency,
                                                    id: findFirstMissingId(prev)
                                                }
                                            ]);
                                        }
                                        if (presetPopupWindow === 1) {
                                            setPresets(prev => [
                                                ...prev,
                                                {
                                                    name: newPresetName,
                                                    frequency: Number(parseFloat(newPresetFreq).toFixed(1)),
                                                    id: findFirstMissingId(presets)
                                                }
                                            ]);
                                        }
                                    } else {
                                        setPresets(prev =>
                                            prev.map(preset => {
                                                    const idd = findFirstMissingId(presets)
                                                    if (currentId === editModal) setCurrentId(idd)
                                                    return preset.id === editModal
                                                        ? {
                                                            id: idd,
                                                            name: newPresetName,
                                                            frequency: Number(parseFloat(newPresetFreq).toFixed(1))
                                                        }
                                                        : preset
                                                }
                                            )
                                        );
                                    }

                                    setShowCreateModal(false)
                                    setNewPresetFreq('')
                                    setNewPresetName('')
                                    setEditModal(-1)
                                }} variant={'glass'}>
                                    Save
                                </Button>
                            </Host>
                        </GlassView>
                    </Pressable>
                </Pressable>
            </Modal>
            <Modal
                animationType="fade"
                transparent={true}
                visible={renameRoomModal.visible}
                onRequestClose={() => setRenameRoomModal(prev => ({ ...prev, visible: false }))}
            >
                <Pressable
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingBottom: 200,
                        width: '100%'
                    }}
                    onPress={() => setRenameRoomModal(prev => ({ ...prev, visible: false }))}
                >
                    <Pressable style={{ width: '100%' }} onPress={(e) => e.stopPropagation()}>
                        <GlassView
                            style={{
                                width: '80%',
                                alignSelf: 'center',
                                padding: 24,
                                borderRadius: 24,
                                gap: 16,
                            }}
                            tintColor="rgba(50,50,50,0.7)"
                            glassEffectStyle="regular"
                        >
                            <Text style={[localStyles.text, localStyles.headline]}>
                                Rename Room
                            </Text>
                            <TextInput
                                placeholder="Room name"
                                placeholderTextColor="#aaa"
                                value={renameRoomModal.name}
                                autoFocus={true}
                                inputMode={'text'}
                                maxLength={20}
                                onChangeText={(text) => setRenameRoomModal(prev => ({ ...prev, name: text }))}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    borderRadius: 12,
                                    width: '100%',
                                    padding: 10,
                                    fontSize: 16,
                                }}
                            />
                            <Host matchContents>
                                <Button color={'white'} onPress={() => {
                                    if (!renameRoomModal.name.trim()) return;
                                    setRooms(prev => prev.map(r =>
                                        r.id === renameRoomModal.id ? { ...r, name: renameRoomModal.name.trim() } : r
                                    ));
                                    setRenameRoomModal(prev => ({ ...prev, visible: false }));
                                }} variant={'glass'}>
                                    Save
                                </Button>
                            </Host>
                        </GlassView>
                    </Pressable>
                </Pressable>
            </Modal>
            <Modal
                animationType="fade"
                transparent={true}
                visible={movingOverlay.visible}
                statusBarTranslucent={true}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    justifyContent: 'center',
                    alignItems: 'center',
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
                        {movingOverlay.status === 'moving' && (
                            <>
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
                                        Moving to frequency
                                    </Text>
                                    <Text style={[localStyles.text, {fontSize: 32, fontWeight: '800'}]}>
                                        {movingOverlay.freq.toFixed(1)}Hz
                                    </Text>
                                    <Text style={[localStyles.text, localStyles.footnote, {color: 'rgba(255,255,255,0.5)', textAlign: 'center'}]}>
                                        Please wait while the Acoustic Pod adjusts...
                                    </Text>
                                </View>
                            </>
                        )}

                        {movingOverlay.status === 'success' && (
                            <>
                                <View style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    backgroundColor: 'rgba(52,199,89,0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <IconSymbol name="checkmark" color="#34C759" size={26}/>
                                </View>
                                <View style={{alignItems: 'center', gap: 8}}>
                                    <Text style={[localStyles.text, localStyles.headline]}>
                                        Frequency set
                                    </Text>
                                    <Text style={[localStyles.text, {fontSize: 32, fontWeight: '800'}]}>
                                        {movingOverlay.freq.toFixed(1)}Hz
                                    </Text>
                                </View>
                            </>
                        )}

                        {movingOverlay.status === 'error' && (
                            <>
                                <View style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    backgroundColor: 'rgba(255,59,48,0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <IconSymbol name="xmark" color="#FF3B30" size={26}/>
                                </View>
                                <View style={{alignItems: 'center', gap: 8}}>
                                    <Text style={[localStyles.text, localStyles.headline]}>
                                        Failed to set frequency
                                    </Text>
                                    <Text style={[localStyles.text, localStyles.footnote, {color: 'rgba(255,255,255,0.5)', textAlign: 'center'}]}>
                                        The Acoustic Pod did not respond. Please try again.
                                    </Text>
                                </View>
                            </>
                        )}
                        {movingOverlay.status === 'oor' && (
                            <>
                                <View style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 26,
                                    backgroundColor: 'rgba(255,159,10,0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <IconSymbol name="exclamationmark.triangle" color="#FF9F0A" size={26}/>
                                </View>
                                <View style={{alignItems: 'center', gap: 8}}>
                                    <Text style={[localStyles.text, localStyles.headline]}>
                                        Out of range
                                    </Text>
                                    <Text style={[localStyles.text, {fontSize: 32, fontWeight: '800'}]}>
                                        {movingOverlay.freq.toFixed(1)}Hz
                                    </Text>
                                    <Text style={[localStyles.text, localStyles.footnote, {color: 'rgba(255,255,255,0.5)', textAlign: 'center'}]}>
                                        This frequency is out of range for this Acoustic Pod.
                                    </Text>
                                </View>
                            </>
                        )}
                    </GlassView>
                </View>

            </Modal>

        </>


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
        minHeight: "100%",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
        gap: 10,
        // justifyContent: "space-between"
    },
    titleBox: {
        width: "100%",

        flexDirection: "column",

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
        fontWeight: "regular",
    },
    largeTitle: {
        fontSize: 30,
        fontWeight: "bold",
    },
    titleContainer: {
        gap: 10,
    },
    text: {

        // fontWeight: 'regular',
        color: "#fff",
    },
});
