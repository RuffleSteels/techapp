import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Alert, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Animated} from "react-native";
import * as Haptics from 'expo-haptics';
import {styles} from "../lib/theme";
import {Stack, useLocalSearchParams, useRouter} from "expo-router";
import {Button, ContextMenu, Host, Menu} from '@expo/ui/swift-ui';

import {GlassView} from "expo-glass-effect";
import {font, foregroundStyle, frame, glassEffect, labelStyle, padding} from "@expo/ui/swift-ui/modifiers";
import {useHeaderHeight} from '@react-navigation/elements';

import {IconSymbol} from "../lib/ui/icon-symbol";
import {findTop3ModesInRange, loadData, saveData, toDisplay, fromDisplay} from "../lib/utils";
import {Device, Preset, Room} from "../lib/types";
import {useBLE} from "../lib/BLEProvider";
import Svg, { Path } from "react-native-svg";

const WAVEFORM_SEED = 40;

function generateWaveformPath(seed: number): string {
    let s = seed;
    const rand = () => {
        s = (s * 1664527 + 101390422) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };

    const width = 196;
    const height = 59;
    const points: {x: number, y: number}[] = [];

    const baseLevel = rand();
    const amplitude = rand() * 0.6 + 0.2;
    const drift = (rand() - 0.5) * 1.2;
    const numPoints = Math.floor(rand() * 5) + 7;

    let direction = rand() > 0.5 ? 1 : -1;

    const xPositions = [0];
    for (let i = 1; i < numPoints - 1; i++) {
        const prev = xPositions[i - 1];
        const remaining = numPoints - i;
        const minStep = (width - prev) / (remaining * 2);
        const maxStep = (width - prev) / remaining * 1.4;
        xPositions.push(prev + minStep + rand() * (maxStep - minStep));
    }
    xPositions.push(width);

    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const x = xPositions[i];
        const driftedBase = baseLevel + drift * t;
        let y: number;

        if (i === 0 || i === numPoints - 1) {
            y = driftedBase * height;
        } else {
            const swing = amplitude * (rand() * 0.8 + 0.2);
            if (rand() > 0.7) direction = rand() > 0.5 ? 1 : -1;
            else direction *= -1;
            y = (driftedBase + direction * swing) * height;
        }

        points.push({ x, y: Math.max(3, Math.min(height - 3, y)) });
    }

    let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const dx = points[i + 1].x - points[i].x;
        const h1 = 0.35 + rand() * 0.25;
        const h2 = 0.35 + rand() * 0.25;
        const cp1x = points[i].x + dx * h1;
        const cp1y = points[i].y;
        const cp2x = points[i + 1].x - dx * h2;
        const cp2y = points[i + 1].y;
        d += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
    }
    return d;
}

interface RoomCardProps {
    item: Room;
    i: number;
    setCurrentId: React.Dispatch<React.SetStateAction<number>>;
    setCurrentMode: React.Dispatch<React.SetStateAction<number>>;
    setCurrentDimension: React.Dispatch<React.SetStateAction<any>>;
    setSetFrequencyModal: React.Dispatch<React.SetStateAction<boolean>>;
    setNewFrequency: React.Dispatch<React.SetStateAction<string>>;
    currentMode: number;
    currentDimension: any;
    currentId: number;
    pendingRoomDimension: {id: number, dimension: number} | null;
    setPendingRoomDimension: React.Dispatch<React.SetStateAction<{id: number, dimension: number} | null>>;
    handleSetRoom: () => Promise<void>;
    deviceRange: [number, number];
}

function RoomCard({
                      item,
                      deviceRange,
                      setSetFrequencyModal,
                      setNewFrequency,
                      setCurrentId,
                      setCurrentMode,
                      currentDimension,
                      setCurrentDimension,
                      currentMode,
                      currentId,
                      pendingRoomDimension,
                      setPendingRoomDimension,
                      handleSetRoom,
                  }: RoomCardProps) {

    const activeDim = pendingRoomDimension?.id === item.id
        ? pendingRoomDimension.dimension
        : (currentDimension?.[item.id] ?? 0);

    const calculatedModes = useMemo(() => {
        const l = item.dimensions[0] as number;
        const w = item.dimensions[1] as number;
        const h = item.dimensions[2] as number;
        return findTop3ModesInRange(l, w, h, deviceRange);
    }, [item.dimensions, deviceRange]);

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
                        if (calculatedModes.length === 0) return;

                        const currentDim = pendingRoomDimension?.id === item.id
                            ? pendingRoomDimension.dimension
                            : (currentDimension[item.id] ?? 0);

                        if (pendingRoomDimension?.id === item.id || (item.id === currentId && currentMode === 1)) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            const next = (currentDim + 1) % calculatedModes.length;
                            setPendingRoomDimension({id: item.id, dimension: next});
                        } else {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPendingRoomDimension({id: item.id, dimension: 0});
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
                        borderRadius: 18,
                        position: 'relative'
                    }}>

                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            <Text style={[localStyles.text, localStyles.body, (currentMode === 1 && item.id === currentId || pendingRoomDimension?.id === item.id) && {fontWeight: '600'}]}>
                                {item.name}
                            </Text>
                        </View>
                        {pendingRoomDimension?.id === item.id && (
                            <View style={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                gap: 8,
                                zIndex: 100,
                                transform: [{ translateY: -28 }],
                            }}>
                                <Host style={{ height: 36, width: 90 }}>
                                    <Button
                                        label="Cancel"
                                        variant="plain"
                                        onPress={() => setPendingRoomDimension(null)}
                                        modifiers={[
                                            foregroundStyle('white'),
                                            font({ size: 15 }),
                                            frame({ maxWidth: 10000, maxHeight: 10000 }),
                                            glassEffect({ glass: { variant: 'regular', interactive: true, tint: 'rgba(255,255,255,0.0)' }, shape: 'capsule' }),
                                        ]}
                                    />
                                </Host>
                                <Host style={{ height: 36, width: 90 }}>
                                    <Button
                                        label="Set"
                                        variant="plain"
                                        onPress={handleSetRoom}
                                        modifiers={[
                                            foregroundStyle('white'),
                                            font({ size: 15 }),
                                            frame({ maxWidth: 10000, maxHeight: 10000 }),
                                            glassEffect({ glass: { variant: 'regular', interactive: true, tint: 'rgba(255,255,255,0.0)' }, shape: 'capsule' }),
                                        ]}
                                    />
                                </Host>
                            </View>
                        )}
                        <View style={{flexDirection: 'row', gap: 24, justifyContent: 'space-between', alignItems: 'flex-end'}}>

                            <View style={{gap: 2}}>
                                {calculatedModes.length > 0 ? calculatedModes.map((mode, idx) => (
                                    <Text key={idx} style={[localStyles.text, localStyles.footnote, {fontWeight: activeDim === idx ? '800' : '300'}]}>
                                        Mode {idx + 1}: {toDisplay(mode.frequency)}Hz
                                    </Text>
                                )) : (
                                    <Text style={[localStyles.text, localStyles.footnote, {color: 'rgba(255,255,255,0.5)'}]}>
                                        No resonant modes found in range.
                                    </Text>
                                )}
                            </View>

                            <View style={{flexGrow: 1}}>
                                <Svg
                                    width="100%"
                                    height="59"
                                    viewBox="0 0 196 59"
                                    preserveAspectRatio="none"
                                >
                                    <Path
                                        vectorEffect="non-scaling-stroke"
                                        d={generateWaveformPath(WAVEFORM_SEED * 999983 + item.id * 7919 + item.name.charCodeAt(0) * 31337 + item.name.length * 1234567)}
                                        stroke="#69ABCE"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                </Svg>


                            </View>
                        </View>
                    </View>
                </Button>
            </Host>
        </View>
    </GlassView>
}

function findFirstMissingId(items: any[]): number {
    const ids = new Set(items.map(item => item.id));
    let i = 0;
    while (ids.has(i)) i++;
    return i;
}

export default function DeviceScreen() {
    const {id} = useLocalSearchParams();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);
    const previousSelection = useRef<{id: number, mode: number} | null>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [deviceName, setDeviceName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const hasMismatch = useRef(false);
    const [movingOverlay, setMovingOverlay] = useState<{visible: boolean, freq: number, status: 'moving' | 'success' | 'error' | 'oor'}>({
        visible: false, freq: 0, status: 'moving'
    });
    const [renameRoomModal, setRenameRoomModal] = useState<{visible: boolean, id: number, name: string}>({
        visible: false, id: -1, name: ''
    });
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);
    const {sendMessage, connectedDevice: cd, disconnectDevice, connectedDevice} = useBLE();
    const [pendingPreset, setPendingPreset] = useState<number | null>(null);
    const [currentFrequency, _setCurrentFrequency] = useState(0);
    const [currentMode, setCurrentMode] = useState(-1);
    const [currentId, setCurrentId] = useState(-1);
    const [currentDimension, setCurrentDimension] = useState<Record<number, number>>({});
    const hasLoaded = useRef(false);
    const isInitialSync = useRef(true);
    const [pendingRoomDimension, setPendingRoomDimension] = useState<{id: number, dimension: number} | null>(null);
    const [editModal, setEditModal] = useState(-1);
    const [presetPopupWindow, setPresetPopupWindow] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetFreq, setNewPresetFreq] = useState('');
    const [setFrequencyModal, setSetFrequencyModal] = useState(false);
    const [newFrequency, setNewFrequency] = useState('');
    const [newDeviceName, setNewDeviceName] = useState('');
    const [deviceNameEdit, setDeviceNameEdit] = useState(false);
    const [minFrequency, setMinFrequency] = useState(80);
    const [maxFrequency, setMaxFrequency] = useState(120);
    const [calibrateOverlay, setCalibrateOverlay] = useState<{visible: boolean, status: 'calibrating' | 'success' | 'error'}>({
        visible: false, status: 'calibrating'
    });
    const headerHeight = useHeaderHeight();
    const loadingOpacity = useRef(new Animated.Value(1)).current;

    const setCurrentFrequency = useCallback(async (newFreq: number, isFirst: boolean = false): Promise<boolean> => {
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
            } else {
                setMovingOverlay(prev => ({ ...prev, status: 'error' }));
                setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 2000);
                return false;
            }
        } catch (e) {
            setMovingOverlay(prev => ({ ...prev, status: 'error' }));
            setTimeout(() => setMovingOverlay(prev => ({ ...prev, visible: false })), 2000);
            return false;
        }
    }, [currentFrequency, sendMessage]);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            hasMismatch.current = false;
            isInitialSync.current = true;

            let storedDevices = (await loadData('devices')) || [];
            const storedRooms = (await loadData('rooms')) || [];
            const storedPresets = (await loadData('presets')) || [];
            const index = parseInt(id as string);

            const response = await sendMessage('GET_FREQ');
            let frequency = 0;
            let range = [80, 120];

            if (response && typeof response !== 'string' && 'current' in response) {
                frequency = response.current;
                range = [response.min + 0.1, response.max - 0.1];
                setMinFrequency(range[0]);
                setMaxFrequency(range[1]);
            }

            if (frequency && storedDevices[index]) {
                const originalFreq = storedDevices[index]?.frequency;
                const savedId = storedDevices[index]?.currentId;
                const savedMode = storedDevices[index]?.currentMode;

                const selectedFreq = (() => {
                    if (savedId < 0 || savedMode < 0) return null;
                    if (savedMode === 0) {
                        const preset = storedPresets.find(p => p.id === savedId);
                        return preset ? preset.frequency : null;
                    } else if (savedMode === 1) {
                        const room = storedRooms.find(r => r.id === savedId);
                        if (!room) return null;
                        const savedDimIdx = storedDevices[index]?.currentDimension?.[savedId] ?? 0;
                        const modes = findTop3ModesInRange(
                            room.dimensions[0],
                            room.dimensions[1],
                            room.dimensions[2],
                            [range[0], range[1]]
                        );
                        return modes[savedDimIdx]?.frequency ?? null;
                    }
                    return null;
                })();

                if (
                    frequency.toFixed(1) !== originalFreq?.toFixed(1) ||
                    (selectedFreq !== null && frequency.toFixed(1) !== parseFloat(selectedFreq).toFixed(1))
                ) {
                    hasMismatch.current = true;
                }

                storedDevices = storedDevices.map(d =>
                    d.deviceId === cd.id
                        ? { ...d, frequency: frequency, ...(hasMismatch.current ? { currentId: -1, currentMode: -1 } : {}) }
                        : d
                );
            }

            setDevices(storedDevices);
            setRooms(storedRooms);
            setPresets(storedPresets);

            if (!isNaN(index) && storedDevices[index]) {
                const d = storedDevices[index];
                setDeviceName(d?.name ?? '');
                setNewDeviceName(d?.name ?? '');
                setCurrentId(hasMismatch.current ? -1 : (d?.currentId ?? -1));
                setCurrentMode(hasMismatch.current ? -1 : (d?.currentMode ?? -1));
                _setCurrentFrequency(d?.frequency ?? 0);
                setCurrentDimension(d?.currentDimension ?? {});
                setDeviceId(d?.deviceId ?? '');
            }

            hasLoaded.current = true;
            setTimeout(() => { isInitialSync.current = false; }, 0);
            setIsReady(true);
            animationRef.current = Animated.timing(loadingOpacity, {
                toValue: 0,
                delay: 500,
                duration: 500,
                useNativeDriver: true,
            });
            animationRef.current.start();

        };

        init();
    }, [id]);

    useEffect(() => {
        if (!hasLoaded.current) return;
        if (!id) return;
        const parsedId = parseInt(id as string);
        if (isNaN(parsedId)) return;

        setDevices(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(item =>
                item.id === parsedId
                    ? { ...item, name: deviceName, frequency: currentFrequency, currentMode, currentId, currentDimension }
                    : item
            );
        });
    }, [deviceName, currentFrequency, currentMode, currentId, currentDimension, id]);

    useEffect(() => { if (hasLoaded.current) saveData('devices', devices); }, [devices]);
    useEffect(() => { if (hasLoaded.current) saveData('presets', presets); }, [presets]);
    useEffect(() => { if (hasLoaded.current) saveData('rooms', rooms); }, [rooms]);

    useEffect(() => {
        if (!hasLoaded.current || isInitialSync.current) return;
        if (currentId < 0 || currentMode < 0) return;

        if (currentMode === 0) {
            const preset = presets.find(item => item.id === currentId);
            if (preset) setCurrentFrequency(preset.frequency);
        } else if (currentMode === 1) {
            const room = rooms.find(item => item.id === currentId);
            if (room) {
                const modes = findTop3ModesInRange(
                    room.dimensions[0] as number,
                    room.dimensions[1] as number,
                    room.dimensions[2] as number,
                    [minFrequency, maxFrequency]
                );
                const activeIdx = currentDimension[currentId] ?? 0;
                if (modes[activeIdx]) setCurrentFrequency(modes[activeIdx].frequency);
            }
        }
    }, [currentId, currentMode, currentDimension, presets, rooms, minFrequency, maxFrequency]);

    useEffect(() => {
        if (!hasLoaded.current || isInitialSync.current) return;
        if (pendingPreset === null) return;

        const run = async () => {
            const preset = presets.find(p => p.id === pendingPreset);
            if (!preset) return;
            const success = await setCurrentFrequency(preset.frequency);
            if (success) {
                setCurrentId(pendingPreset);
                setCurrentMode(0);
            }
            setPendingPreset(null);
        };
        run();
    }, [pendingPreset]);

    useEffect(() => {
        if (!isReady) return;
        if (!connectedDevice) router.back();
    }, [connectedDevice, isReady]);

    const handleRecalibrate = async () => {
        setCalibrateOverlay({ visible: true, status: 'calibrating' });
        try {
            const response = await sendMessage('CALIBRATE');
            if (response === 'OK') {
                setCalibrateOverlay({ visible: true, status: 'success' });
                setTimeout(() => setCalibrateOverlay(prev => ({ ...prev, visible: false })), 2000);
            } else {
                setCalibrateOverlay({ visible: true, status: 'error' });
                setTimeout(() => setCalibrateOverlay(prev => ({ ...prev, visible: false })), 3000);
            }
        } catch (e) {
            setCalibrateOverlay({ visible: true, status: 'error' });
            setTimeout(() => setCalibrateOverlay(prev => ({ ...prev, visible: false })), 3000);
        }
    };

    const handleSetRoom = async () => {
        if (pendingRoomDimension === null) return;
        const room = rooms.find(r => r.id === pendingRoomDimension.id);
        if (!room) return;

        const modes = findTop3ModesInRange(
            room.dimensions[0] as number,
            room.dimensions[1] as number,
            room.dimensions[2] as number,
            [minFrequency, maxFrequency]
        );        const freq = modes[pendingRoomDimension.dimension]?.frequency ?? 0;

        previousSelection.current = { id: currentId, mode: currentMode };
        const success = await setCurrentFrequency(freq);

        if (success) {
            setCurrentId(pendingRoomDimension.id);
            setCurrentMode(1);
            setCurrentDimension(prev => ({ ...prev, [pendingRoomDimension.id]: pendingRoomDimension.dimension }));
        } else {
            setCurrentId(previousSelection.current?.id ?? -1);
            setCurrentMode(previousSelection.current?.mode ?? -1);
        }
        setPendingRoomDimension(null);
    };

    if (!isReady) return null;

    return (
        <>
            <View style={{ position: 'absolute', top: headerHeight - 58, left: 80, right: 0, zIndex: 2000, alignItems: 'center' }}>
                <View style={[localStyles.titleBox]}>
                    {deviceNameEdit ? (
                        <TextInput
                            value={newDeviceName}
                            autoFocus
                            onChangeText={setNewDeviceName}
                            style={[{ color: 'white', width: 140, borderRadius: 12, padding: 4, paddingHorizontal: 8, backgroundColor: 'rgba(40,40,40,0.8)', borderBottomColor: 'white', borderBottomWidth: 2 }, localStyles.text, localStyles.largeTitle]}
                        />
                    ) : (
                        <>
                            <Text style={[localStyles.text, localStyles.largeTitle, {marginBottom: -4, zIndex: 1000}]}>{deviceName}</Text>
                            <Text style={[localStyles.text, localStyles.footnote, { zIndex: 1000}]}>Acoustic Pod</Text>
                        </>
                    )}
                </View>
            </View>
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                <View style={styles.container}>
                    <ImageBackground source={require("../assets/images/gradient.png")} style={styles.background} imageStyle={{ top: -500, filter: 'brightness(0.2)', height: '250%' }} resizeMode="cover">
                        <View style={localStyles.wrapper}>
                            <Stack.Screen options={{
                                headerTransparent: true,
                                title: '',
                                headerRight: () => (
                                    deviceNameEdit ? (
                                        <View style={{flexDirection: 'row', gap: 12}}>
                                            <Host matchContents>
                                                <Button
                                                    label="Cancel"
                                                    variant="plain"
                                                    modifiers={[foregroundStyle('white'), glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })]}
                                                    onPress={() => { setDeviceNameEdit(false); setNewDeviceName(deviceName); }}
                                                />
                                            </Host>

                                            <Host matchContents>
                                                <Button
                                                    label="Set"
                                                    variant="plain"
                                                    modifiers={[foregroundStyle('white'), glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })]}
                                                    onPress={() => { if (!newDeviceName) return; setDeviceName(newDeviceName); setDeviceNameEdit(false); }}
                                                />
                                            </Host>
                                        </View>
                                    ) : (
                                        <Host style={{ width: 54, height: 44 }}>
                                            <Menu label="Options" systemImage="ellipsis" modifiers={[labelStyle('iconOnly'), foregroundStyle('white'), font({ size: 32 })]}>
                                                <Button label="Recalibrate" systemImage="waveform.path" onPress={handleRecalibrate} />
                                                <Button label="Rename" systemImage="pencil" onPress={() => setDeviceNameEdit(true)} />
                                                <Button label="Delete" systemImage="trash" role="destructive" onPress={async () => { if (connectedDevice) disconnectDevice(); setDevices(prev => prev.filter(item => item.id !== parseInt(id as string))); router.back(); }} />
                                            </Menu>
                                        </Host>
                                    )
                                )
                            }}/>

                            <View style={{gap: 24, paddingBottom: 16}}>
                                <View style={{backgroundColor: 'rgba(0,0,0,0.44)', position: 'absolute', width: '200%', height: 1000, bottom: 0, alignSelf: 'center'}} />
                                <View>
                                    <Text style={[localStyles.text, localStyles.footnote]}>Current Frequency</Text>
                                    <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {setFrequencyModal ? (
                                            <View style={{marginRight: 32, flexDirection: 'row'}}>
                                                <TextInput value={newFrequency} autoFocus inputMode='decimal' maxLength={5} onChangeText={t => /^[0-9]*\.?[0-9]*$/.test(t) && setNewFrequency(t)} style={{ color: 'white', flexShrink: 1, fontSize: 36, fontWeight: '800', marginRight: 8, borderBottomColor: 'white', borderBottomWidth: 3 }} />
                                                <Text style={[localStyles.text, { fontSize: 36, fontWeight: '800' }]}>Hz</Text>
                                            </View>
                                        ) : (
                                            <Text style={[localStyles.text, {fontSize: 36, fontWeight: '800'}]}>{currentFrequency ? toDisplay(currentFrequency) : ''}Hz</Text>
                                        )}

                                        <View style={{flexDirection: 'row', gap: 12}}>
                                            {setFrequencyModal ? (
                                                <>
                                                    <Host style={{ height: 12, width: 70 }}>
                                                        <Button label="Cancel" variant="plain"
                                                                modifiers={[padding({horizontal: 8, vertical: 3}),foregroundStyle('white'), glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })]}
                                                                onPress={() => { setSetFrequencyModal(false); setNewFrequency(''); }}
                                                        />
                                                    </Host>

                                                    <Host style={{ height: 12, width: 50 }}>
                                                        <Button label="Set" variant="plain"
                                                                modifiers={[padding({horizontal: 8, vertical: 3}),foregroundStyle('white'), glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })]}
                                                                onPress={() => {
                                                                    const actual = fromDisplay(parseFloat(newFrequency));
                                                                    if (!newFrequency || actual < minFrequency || actual > maxFrequency) {
                                                                        Alert.alert('Out of range', `Please enter a frequency between ${toDisplay(minFrequency)} and ${toDisplay(maxFrequency)} Hz`);
                                                                    } else {
                                                                        setCurrentFrequency(actual);
                                                                        setSetFrequencyModal(false);
                                                                        setCurrentId(-1);
                                                                    }
                                                                }}
                                                        />
                                                    </Host>
                                                </>
                                            ) : (
                                                <Host style={{ height: 36, width: 90 }}>
                                                    <Button label="Change" variant="plain"
                                                            modifiers={[padding({horizontal: 8, vertical: 3}), foregroundStyle('white'), glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })]}
                                                            onPress={() => setSetFrequencyModal(true)}
                                                    />
                                                </Host>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={{gap: 32}}>
                                <View style={{gap: 12}}>
                                    <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={[localStyles.text, localStyles.headline]}>Presets</Text>
                                        <Host matchContents>

                                        <Menu label="Add" systemImage="plus" modifiers={[labelStyle('iconOnly'), foregroundStyle('white'), font({ size: 20 }), padding({horizontal: 4, vertical: 4}), glassEffect({ glass: { variant: 'regular', interactive: true, tint: 'rgba(255,255,255,0)' } })]}>
                                            <Button label="From current" systemImage="plus.circle" onPress={() => { setPresetPopupWindow(0); setShowCreateModal(true); }} />
                                            <Button label="New" systemImage="plus.circle" onPress={() => { setPresetPopupWindow(1); setShowCreateModal(true); }} />
                                        </Menu>
                                        </Host>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{overflow: 'visible'}} contentContainerStyle={{ gap: 10, marginLeft: 0,paddingHorizontal: 0, marginHorizontal: -16 }}>
                                        {presets.map(item => {
                                            const active = currentMode === 0 && item.id === currentId;
                                            return (
                                                <Host key={item.id} style={{ height: 72, width: 150 }}>
                                                    <ContextMenu>
                                                        <ContextMenu.Items>
                                                            <Button label="Edit" systemImage="pencil" onPress={() => { setEditModal(item.id); setNewPresetName(item.name); setNewPresetFreq(toDisplay(item.frequency)); setShowCreateModal(true); setPresetPopupWindow(1); }} />
                                                            <Button label="Delete" systemImage="trash" role="destructive" onPress={() => setPresets(prev => prev.filter(x => x.id !== item.id))} />
                                                        </ContextMenu.Items>
                                                        <ContextMenu.Trigger>
                                                            <GlassView style={[localStyles.glassBox, { width: 160, height: 78 }]} tintColor={active ? 'rgba(161,172,184,0.68)' : 'rgba(50,50,50,.7)'} glassEffectStyle="clear">
                                                                <Pressable onPress={() => { setPendingPreset(item.id); setSetFrequencyModal(false); setPendingRoomDimension(null); }} style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, width: '100%' }}>
                                                                    <Text numberOfLines={1} style={[localStyles.text, localStyles.body, active && {fontWeight: '600'}]}>{item.name}</Text>
                                                                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                                        <IconSymbol name="waveform.path" color={active ? '#fff' : '#afafaf'} size={14} />
                                                                        <Text style={[localStyles.text, localStyles.subheadline, {color: active ? '#fff' : '#afafaf'}]}>{toDisplay(item.frequency)}Hz</Text>
                                                                    </View>
                                                                </Pressable>
                                                            </GlassView>
                                                        </ContextMenu.Trigger>
                                                    </ContextMenu>
                                                </Host>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <View style={{gap: 12}}>
                                    <Text style={[localStyles.text, localStyles.headline]}>Rooms</Text>
                                    <View style={{gap: 16}}>
                                        {rooms
                                            .filter(item =>
                                                Array.isArray(item.dimensions) && item.dimensions.length === 3
                                            )
                                            .map((item, i) => (
                                                <Host key={item.id} matchContents>
                                                    <ContextMenu>
                                                    <ContextMenu.Items>
                                                        <Button label="Rename" systemImage="pencil" onPress={() => setRenameRoomModal({ visible: true, id: item.id, name: item.name })} />
                                                        <Button label="Delete" systemImage="trash" role="destructive" onPress={() => setRooms(prev => prev.filter(x => x.id !== item.id))} />
                                                    </ContextMenu.Items>
                                                    <ContextMenu.Trigger>
                                                        <View style={{ width: '100%' }}>

                                                        <RoomCard
                                                            item={item} i={i}
                                                            setCurrentId={setCurrentId} setCurrentMode={setCurrentMode} setCurrentDimension={setCurrentDimension}
                                                            setSetFrequencyModal={setSetFrequencyModal} setNewFrequency={setNewFrequency}
                                                            currentMode={currentMode} currentDimension={currentDimension} currentId={currentId}
                                                            pendingRoomDimension={pendingRoomDimension} setPendingRoomDimension={setPendingRoomDimension}
                                                            handleSetRoom={handleSetRoom} deviceRange={[minFrequency, maxFrequency]}
                                                        />
                                                        </View>
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

            <Modal visible={showCreateModal} transparent animationType="fade">
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => { setShowCreateModal(false); setNewPresetName(''); setNewPresetFreq(''); setEditModal(-1); }}
                >
                    <Pressable onPress={e => e.stopPropagation()} style={{ width: '80%' }}>
                        <GlassView style={{ padding: 24, borderRadius: 24, gap: 16 }} tintColor="rgba(50,50,50,0.7)" glassEffectStyle="regular">
                            <Text style={[localStyles.text, localStyles.headline]}>{editModal >= 0 ? 'Edit Preset' : 'Create Preset'}</Text>
                            <View style={{gap: 12}}>
                                {(presetPopupWindow === 1 || editModal >= 0) && (
                                    <TextInput
                                        placeholder="Frequency"
                                        value={newPresetFreq}
                                        onChangeText={t => /^[0-9]*\.?[0-9]*$/.test(t) && setNewPresetFreq(t)}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, padding: 10 }}
                                    />
                                )}
                                <TextInput placeholder="Name" maxLength={10} value={newPresetName} onChangeText={setNewPresetName} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, padding: 10 }} />
                            </View>
                            <Host matchContents>
                                <Button label="Save" onPress={() => {
                                    const freq = editModal >= 0 || presetPopupWindow === 1
                                        ? fromDisplay(parseFloat(newPresetFreq))
                                        : currentFrequency;

                                    if (!newPresetName) return;

                                    if ((editModal >= 0 || presetPopupWindow === 1) && (isNaN(freq) || freq < minFrequency || freq > maxFrequency)) {
                                        Alert.alert('Out of range', `Please enter a frequency between ${toDisplay(minFrequency)} and ${toDisplay(maxFrequency)} Hz`);
                                        return;
                                    }

                                    if (editModal >= 0) {
                                        setPresets(prev => prev.map(p =>
                                            p.id === editModal ? { ...p, name: newPresetName, frequency: freq } : p
                                        ));
                                    } else {
                                        setPresets(prev => [...prev, { name: newPresetName, frequency: freq, id: findFirstMissingId(prev) }]);
                                    }
                                    setShowCreateModal(false);
                                    setNewPresetName('');
                                    setNewPresetFreq('');
                                    setEditModal(-1);
                                }} />
                            </Host>
                        </GlassView>
                    </Pressable>
                </Pressable>
            </Modal>
            
            <Modal visible={renameRoomModal.visible} transparent animationType="fade">
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setRenameRoomModal(prev => ({ ...prev, visible: false }))}>
                    <GlassView style={{ width: '80%', padding: 24, borderRadius: 24, gap: 16 }} tintColor="rgba(50,50,50,0.7)" glassEffectStyle="regular">
                        <Text style={[localStyles.text, localStyles.headline]}>Rename Room</Text>
                        <TextInput value={renameRoomModal.name} onChangeText={t => setRenameRoomModal(prev => ({ ...prev, name: t }))} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 12, padding: 10 }} />
                        <Host matchContents>

                        <Button label="Save" onPress={() => { setRooms(prev => prev.map(r => r.id === renameRoomModal.id ? { ...r, name: renameRoomModal.name } : r)); setRenameRoomModal(prev => ({ ...prev, visible: false })); }} />
                        </Host>
                        </GlassView>
                </Pressable>
            </Modal>

            <Modal visible={calibrateOverlay.visible} transparent statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}>
                    <GlassView style={{ width: '75%', padding: 32, borderRadius: 28, alignItems: 'center', gap: 20 }} tintColor="rgba(50,50,50,0.85)" glassEffectStyle="regular">
                        <IconSymbol name={calibrateOverlay.status === 'success' ? 'checkmark' : calibrateOverlay.status === 'error' ? 'xmark' : 'waveform.path'} color={calibrateOverlay.status === 'success' ? '#34C759' : calibrateOverlay.status === 'error' ? '#FF3B30' : '#fff'} size={26} />
                        <Text style={[localStyles.text, localStyles.headline]}>{calibrateOverlay.status === 'calibrating' ? 'Calibrating' : calibrateOverlay.status === 'success' ? 'Complete' : 'Failed'}</Text>
                    </GlassView>
                </View>
            </Modal>

            <Modal visible={movingOverlay.visible} transparent statusBarTranslucent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }}>
                    <GlassView style={{ width: '75%', padding: 32, borderRadius: 28, alignItems: 'center', gap: 20 }} tintColor="rgba(50,50,50,0.85)" glassEffectStyle="regular">
                        <IconSymbol name={movingOverlay.status === 'success' ? 'checkmark' : movingOverlay.status === 'error' ? 'xmark' : movingOverlay.status === 'oor' ? 'exclamationmark.triangle' : 'waveform.path'} color={movingOverlay.status === 'success' ? '#34C759' : movingOverlay.status === 'oor' ? '#FF9F0A' : movingOverlay.status === 'error' ? '#FF3B30' : '#fff'} size={26} />
                        <Text style={[localStyles.text, localStyles.headline]}>{movingOverlay.status === 'moving' ? 'Moving...' : movingOverlay.status === 'success' ? 'Set' : movingOverlay.status === 'oor' ? 'Out of Range' : 'Error'}</Text>
                        <Text style={[localStyles.text, {fontSize: 32, fontWeight: '800'}]}>{toDisplay(movingOverlay.freq)}Hz</Text>
                    </GlassView>
                </View>
            </Modal>

            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#121212', opacity: loadingOpacity, zIndex: 999999999 }} />
        </>
    );
}

const localStyles = StyleSheet.create({
    body: { fontSize: 17, fontWeight: 'semibold' },
    glassBox: { width: '100%', borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "space-between" },
    wrapper: { width: "100%", minHeight: "100%", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 10 },
    titleBox: { width: "100%", flexDirection: "column" },
    headline: { fontSize: 17, fontWeight: "bold" },
    subheadline: { fontSize: 15, fontWeight: "regular" },
    footnote: { fontSize: 13, fontWeight: "regular" },
    largeTitle: { fontSize: 30, fontWeight: "bold" },
    text: { color: "#fff" },
});
