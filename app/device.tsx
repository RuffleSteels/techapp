import React, {useEffect, useRef, useState} from "react";
import {Alert, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";
import * as Haptics from 'expo-haptics';
import {styles} from "@/lib/theme";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import {Button, ContextMenu, Host} from '@expo/ui/swift-ui';

import {GlassView} from "expo-glass-effect";
import {foregroundStyle, glassEffect, padding} from "@expo/ui/swift-ui/modifiers";
import {useHeaderHeight} from '@react-navigation/elements';

// @ts-ignore
import Graph from "@/assets/images/graph.svg"
import {IconSymbol} from "@/lib/ui/icon-symbol";
import {loadData, saveData} from "@/lib/utils";
import {Preset, Room} from "@/lib/types";


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
                      currentId
                  }: RoomCardProps) {

    return <GlassView
        style={[localStyles.glassBox, {width: '100%', height: 'auto', paddingHorizontal: 0, paddingVertical: 0}]}
        tintColor={currentMode === 1 && item.id === currentId ? 'rgba(161,172,184,0.68)' : 'rgba(50,50,50,.7)'}
        glassEffectStyle="clear">
        <View style={[{
            width: '100%',
            // height: '100%'
        }]}>
            <Host style={{
                width: '100%',
                // height: '100%'
            }}>
                <Button
                    onPress={() => {
                        setCurrentId(item.id)
                        setCurrentMode(1)
                        setSetFrequencyModal(false)
                        setNewFrequency('')

                        if (item.id === currentId && currentMode === 1) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                            setCurrentDimension((prev: number[]) => {

                                return ({
                                    ...prev,
                                    [currentId]: (prev[currentId] + 1) % 3
                                })
                            });
                        } else {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }

                    }}
                    variant="plain"
                    modifiers={[
                        glassEffect({
                            glass: {
                                variant: 'identity',
                                interactive: !showCreateModal,
                            },
                            shape: 'rectangle',
                        }),
                    ]}
                >
                    <View style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        gap: 6,
                        borderRadius: 18,
                    }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Text
                                style={[localStyles.text, localStyles.body, currentMode === 1 && item.id === currentId && {fontWeight: '600'}]}>
                                {item.name}
                            </Text>
                        </View>

                        <View style={{flexDirection: 'row', gap: 24, justifyContent: 'space-between'}}>
                            <View style={{gap: 2}}>
                                <Text
                                    style={[localStyles.text, localStyles.footnote, {fontWeight: currentDimension[item.id] === 0 ? '800' : '300'}]}>
                                    Length: {item.length[0]}m - {item.length[1].toFixed(1)}Hz
                                </Text>
                                <Text
                                    style={[localStyles.text, localStyles.footnote, {fontWeight: currentDimension[item.id] === 1 ? '800' : '300'}]}>
                                    Width: {item.width[0]}m - {item.width[1].toFixed(1)}Hz
                                </Text>
                                <Text
                                    style={[localStyles.text, localStyles.footnote, {fontWeight: currentDimension[item.id] === 2 ? '800' : '300'}]}>
                                    Height: {item.height[0]}m - {item.height[1].toFixed(1)}Hz
                                </Text>
                            </View>
                            <View style={{flexGrow: 1}}>
                                <Graph preserveAspectRatio="none" width={'100%'}/>
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

    const [devices, setDevices] = useState<any[]>([]);
    const [deviceName, setDeviceName] = useState('');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [currentFrequency, setCurrentFrequency] = useState(0);
    const [currentMode, setCurrentMode] = useState(-1);
    const [currentId, setCurrentId] = useState(-1);
    const [currentDimension, setCurrentDimension] = useState(
        Object.fromEntries(
            roomss.map(room => [room.id, 0]) // 0 = length
        )
    );
    const hasLoaded = useRef(false);

    useEffect(() => {
        const init = async () => {
            // await saveData('devices', [{id:0, currentId: -1, currentMode: -1,name:'Den',frequency:100}]);
            // await saveData('presets', presetss)
            // await saveData('rooms', roomss)
            const storedDevices = (await loadData('devices')) || [{
                id: 0,
                currentId: -1,
                currentMode: -1,
                name: 'Den',
                frequency: 100
            }];
            const storedRooms = (await loadData('rooms')) || roomss;
            const storedPresets = (await loadData('presets')) || presetss;

            setDevices(storedDevices);
            setRooms(storedRooms);
            setPresets(storedPresets);

            const index = parseInt(id as string);
            if (!isNaN(index) && storedDevices[index]) {
                setDeviceName(storedDevices[index]?.name ?? '');
                setCurrentFrequency(storedDevices[index]?.frequency ?? '');
                setCurrentId(storedDevices[index]?.currentId ?? -1);
                setCurrentMode(storedDevices[index]?.currentMode ?? -1);
                setCurrentDimension(storedDevices[index]?.currentDimension ?? {});
            } else {
                setDeviceName('');
                setCurrentFrequency(0);
                setCurrentId(-1);
                setCurrentMode(-1);
            }

            // ✅ Mark as initialized
            hasLoaded.current = true;
        };

        init();
    }, [id]);

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

    const [editModal, setEditModal] = useState(-1);
    const [presetPopupWindow, setPresetPopupWindow] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetFreq, setNewPresetFreq] = useState('');
    const [setFrequencyModal, setSetFrequencyModal] = useState(false);
    const [newFrequency, setNewFrequency] = useState('');
    useEffect(() => {
        const preset = presets.find((item) => item.id === currentId);
        const room = rooms.find((item) => item.id === currentId);

        if (currentId >= 0) {
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
                        source={require("@/assets/images/gradient.png")}
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
                                                    <Button onPress={() => {
                                                        setDeviceNameEdit(true)
                                                    }} systemImage={'pencil'}>
                                                        Rename
                                                    </Button>
                                                    <Button role={'destructive'} modifiers={[
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
                                                    {currentFrequency.toFixed(1)}Hz
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
                                                                                setCurrentId(item.id)
                                                                                setCurrentMode(0)
                                                                                setSetFrequencyModal(false)
                                                                                setNewFrequency('')
                                                                            }}
                                                                            variant="plain"
                                                                            modifiers={[
                                                                                glassEffect({
                                                                                    glass: {
                                                                                        variant: 'identity',
                                                                                        interactive: !showCreateModal,
                                                                                    },
                                                                                    shape: 'rectangle',
                                                                                }),
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
                                                                                        style={[localStyles.text, localStyles.subheadline, {color: currentMode === 0 && item.id === currentId ? '#d1d1d1' : '#afafaf'}]}>{item.frequency.toFixed(1)}Hz</Text>
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
                                        <View style={{flexDirection: 'row', gap: 10}}>
                                            <Host>
                                                <Button
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                                        router.push('/(tabs)/spaces')
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
                                                            }
                                                        }),
                                                    ]}
                                                    color={'rgba(100,100,100,0.3)'}
                                                >
                                                    <IconSymbol style={{
                                                        textAlign: 'center',
                                                        bottom: 0
                                                    }} size={30} name="plus" color="white"/>

                                                </Button>
                                            </Host>
                                        </View>
                                    </View>
                                    <View
                                        style={{gap: 16}}
                                    >
                                        {rooms.map((item, i) => (
                                            <Host matchContents key={item.id}>
                                                <ContextMenu activationMethod={'longPress'}>
                                                    <ContextMenu.Items>
                                                        <Button systemImage={'pencil'}>
                                                            Edit
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

                                                        <RoomCard setSetFrequencyModal={setSetFrequencyModal}
                                                                  setNewFrequency={setNewFrequency}
                                                                  currentDimension={currentDimension}
                                                                  showCreateModal={showCreateModal} key={i}
                                                                  currentId={currentId} currentMode={currentMode}
                                                                  item={item} i={i} setCurrentMode={setCurrentMode}
                                                                  setCurrentId={setCurrentId}
                                                                  setCurrentDimension={setCurrentDimension}/>
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
                                        Frequency: {currentFrequency.toFixed(1)}Hz
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
                                    Submit
                                </Button>
                            </Host>
                        </GlassView>
                    </Pressable>
                </Pressable>
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
