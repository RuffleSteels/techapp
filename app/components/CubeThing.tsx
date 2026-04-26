// CubeThing.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Dimensions,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import WireframeCuboid from "../components/Cuboid";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Button, Host } from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import { font, foregroundStyle, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import { findTop3ModesInRange, loadData, saveData, toDisplay } from "../../lib/utils";
import { useAnimation } from "../components/AnimationContext";
import { Device, Room, RoomMode } from "../../lib/types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TRAY_HEIGHT = 400;
const CUBE_SIZE = 300; 
const CUBE_TOP_Y = -((SCREEN_HEIGHT - TRAY_HEIGHT) / 2 + CUBE_SIZE/2);

const EASE_OUT_CUBIC = Easing.out(Easing.cubic);

const T_RISE       = 4200;  
const T_SPIN_RAMP  = 1800;
const T_SPIN_HOLD  = 500;
const T_SPIN_DOWN  = 1800;
const T_OVERLAY_IN = 800;
const T_LABEL_IN   = 350;
const T_RESULTS_IN = 500;

function findFirstMissingId(items: Room[]): number {
    const ids = new Set(items.map((item) => item.id));
    let i = 0;
    while (ids.has(i)) i++;
    return i;
}

interface CubeThingProps {
    setDims: React.Dispatch<React.SetStateAction<{ name: string; value: string }[]>>;
    triggerAnim: boolean;
    setTriggerAnim: React.Dispatch<React.SetStateAction<boolean>>;
    dims: { name: string; value: string }[];
}

export default function CubeThing({ setDims, triggerAnim, setTriggerAnim, dims }: CubeThingProps) {
    const { setAnimationRunning } = useAnimation();

    const [name, setName] = useState("");
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const calculatedRef = useRef<RoomMode[]>([]);
    const [useTargetAngle, setUseTargetAngle] = useState(false);

    const [rotSpeed, setRotSpeed] = useState({ x: 0, y: 30, z: 0 });
    const rotSpeedRef = useRef({ x: 0, y: 30, z: 0 });
    const rafRef = useRef<number | null>(null);
    const hapticRafRef = useRef<number | null>(null); 
    
    const cubeY          = useSharedValue(0);
    const overlayProgress = useSharedValue(0);
    const labelOpacity   = useSharedValue(0);
    const resultsOpacity = useSharedValue(0);

    useEffect(() => {
        const show = Keyboard.addListener("keyboardDidShow", (e) =>
            setKeyboardHeight(e.endCoordinates.height - 100));
        const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const interpolateRotation = useCallback((
        from: { x: number; y: number; z: number },
        to:   { x: number; y: number; z: number },
        durationMs: number,
        onDone?: () => void
    ) => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        const start = performance.now();

        const tick = (now: number) => {
            const t = Math.min((now - start) / durationMs, 1);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const next = {
                x: from.x + (to.x - from.x) * ease,
                y: from.y + (to.y - from.y) * ease,
                z: from.z + (to.z - from.z) * ease,
            };
            rotSpeedRef.current = next;
            setRotSpeed({ ...next });

            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                rafRef.current = null;
                onDone?.();
            }
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        if (!triggerAnim) {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (hapticRafRef.current !== null) {
                cancelAnimationFrame(hapticRafRef.current);
                hapticRafRef.current = null;
            }

            cubeY.value           = withTiming(0, { duration: 500, easing: EASE_OUT_CUBIC });
            overlayProgress.value = withTiming(0, { duration: 400 });
            labelOpacity.value    = withTiming(0, { duration: 200 });
            resultsOpacity.value  = withTiming(0, { duration: 200 });

            setRotSpeed({ x: 0, y: 30, z: 0 });
            rotSpeedRef.current = { x: 0, y: 30, z: 0 };
            setUseTargetAngle(false);
            setName("");
            setAnimationRunning(false);
            return;
        }

        const l = parseFloat(dims[0].value) || 3;
        const w = parseFloat(dims[1].value) || 2;
        const h = parseFloat(dims[2].value) || 2.5;
        
        // Preview calculation uses a standard range [80, 120]
        calculatedRef.current = findTop3ModesInRange(l, w, h, [80, 120]);

        setAnimationRunning(true);
        setUseTargetAngle(false);

        cubeY.value           = withTiming(CUBE_TOP_Y, { duration: T_RISE, easing: EASE_OUT_CUBIC });
        overlayProgress.value = withTiming(1, { duration: T_OVERLAY_IN, easing: EASE_OUT_CUBIC });
        
        const hapticStart = performance.now();
        let lastHapticTime = hapticStart;
        const tickHaptic = (now: number) => {
            const progress = Math.min((now - hapticStart) / T_RISE, 1);
            const interval = Math.max(16, 300 - progress * 270);
            if (now - lastHapticTime >= interval) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                lastHapticTime = now;
            }
            if (progress < 1) {
                hapticRafRef.current = requestAnimationFrame(tickHaptic);
            } else {
                hapticRafRef.current = null;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
        };
        hapticRafRef.current = requestAnimationFrame(tickHaptic);

        interpolateRotation(
            { x: 0, y: 30, z: 0 },
            { x: 250, y: 300, z: 0 },
            T_SPIN_RAMP,
            () => {
                labelOpacity.value = withTiming(1, { duration: T_LABEL_IN });
                const t3 = setTimeout(() => {
                    setUseTargetAngle(true);
                    interpolateRotation(
                        { x: 250, y: 300, z: 0 },
                        { x: 0, y: 0, z: 0 },
                        T_SPIN_DOWN,
                        () => {
                            labelOpacity.value = withTiming(0, { duration: 250 });
                            resultsOpacity.value = withTiming(1, { duration: T_RESULTS_IN });
                            setTimeout(() => setAnimationRunning(false), T_RESULTS_IN);
                        }
                    );
                }, T_SPIN_HOLD);
                return () => clearTimeout(t3);
            }
        );
    }, [triggerAnim]);

    const cubeAnimStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: cubeY.value }],
    }));

    const overlayAnimStyle = useAnimatedStyle(() => ({
        height: interpolate(
            overlayProgress.value,
            [0, 1],
            [TRAY_HEIGHT, SCREEN_HEIGHT]
        ),
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: labelOpacity.value,
    }));

    const resultsStyle = useAnimatedStyle(() => ({
        opacity: resultsOpacity.value,
        transform: [
            { translateY: interpolate(resultsOpacity.value, [0, 1], [14, 0]) },
        ],
    }));

    const roomLength = parseFloat(dims[0].value) || 3;
    const roomWidth  = parseFloat(dims[2].value) || 2;
    const roomHeight = parseFloat(dims[1].value) || 2.5;

    return (
        <>
            <Animated.View style={[styles.overlayPanel, overlayAnimStyle]} pointerEvents="none">
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.trayTopEdge} />
            </Animated.View>

            <View style={[styles.cubeWrapper, { paddingBottom: triggerAnim && keyboardHeight > 0 ? keyboardHeight + 120 : 90 }]} pointerEvents="box-none">
                <Animated.View style={[styles.resultsCard, resultsStyle, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 50 }]} pointerEvents={triggerAnim ? "auto" : "none"}>
                    <View style={styles.resultsInner}>
                        <View style={{ gap: 16 }}>
                            <Text style={styles.resultsDescription}>
                                Save your room&#39;s dimensions and we&#39;ll calculate the three resonant frequencies most likely causing issues in your space – so you can tune your Pods to absorb them.
                            </Text>
                            {/*<View style={{ gap: 12 }}>*/}
                            {/*    {(["Length", "Width", "Height"] as const).map((label, i) => (*/}
                            {/*        <Text key={label} style={styles.frequencyLine}>*/}
                            {/*            {label}: {calculatedRef.current[i] ? `${toDisplay(calculatedRef.current[i].frequency)}Hz` : "N/A"}*/}
                            {/*        </Text>*/}
                            {/*    ))}*/}
                            {/*</View>*/}
                        </View>

                        <View style={styles.saveRow}>
                            <TextInput
                                placeholder="Enter a name..."
                                placeholderTextColor="#aaa"
                                value={name}
                                autoFocus={false}
                                inputMode="text"
                                maxLength={15}
                                onChangeText={setName}
                                style={styles.nameInput}
                            />
                            <Host style={{ width: 148, height: 50 }}>
                                <Button
                                    label="Save Space"
                                    variant="plain"
                                    modifiers={[
                                        padding({ vertical: 8, horizontal: 16 }),
                                        foregroundStyle("white"),
                                        font({ size: 22 }),
                                        glassEffect({
                                            glass: {
                                                variant: "regular",
                                                interactive: true,
                                                tint: "rgba(255,255,255,0.1)",
                                            },
                                            shape: "capsule",
                                        }),
                                    ]}
                                    onPress={async () => {
                                        if (!name) {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
                                            return;
                                        }
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                                        const devices: Device[] = await loadData("devices") || [];
                                        const rooms: Room[]     = await loadData("rooms") || [];
                                        const id = findFirstMissingId(rooms);
                                        const newRoom: Room = {
                                            name,
                                            dimensions: [roomLength, roomWidth, roomHeight],
                                            id,
                                        };
                                        
                                        devices.forEach((item: Device) => {
                                            if (!item.currentDimension) item.currentDimension = {};
                                            item.currentDimension[id] = 0;
                                        });
                                        
                                        rooms.push(newRoom);
                                        await saveData("devices", devices);
                                        await saveData("rooms", rooms);

                                        setTimeout(() => {
                                            setDims([
                                                { name: "Length", value: "0" },
                                                { name: "Width",  value: "0" },
                                                { name: "Height", value: "0" },
                                            ]);
                                            setName("");
                                        }, 100);
                                        setTriggerAnim(false);
                                    }}
                                />
                            </Host>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={cubeAnimStyle}>
                    <WireframeCuboid
                        width={roomLength * 40}
                        height={roomWidth * 40}
                        depth={roomHeight * 40}
                        size={300}
                        rotationSpeedX={rotSpeed.x}
                        rotationSpeedY={rotSpeed.y}
                        rotationSpeedZ={rotSpeed.z}
                        targetAngleX={useTargetAngle ? 20  : undefined}
                        targetAngleY={useTargetAngle ? -45 : undefined}
                        targetAngleZ={useTargetAngle ? 0   : undefined}
                    />
                </Animated.View>

                <Animated.Text style={[styles.calcLabel, labelStyle, { position: 'absolute', top: 0 }]}>
                    Calculating frequencies...
                </Animated.Text>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    overlayPanel: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 15,
        overflow: "hidden",
    },
    trayTopEdge: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    cubeWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: TRAY_HEIGHT,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 60,
        overflow: "visible",
        zIndex: 16,
    },
    resultsCard: {
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        paddingHorizontal: 32,
        paddingBottom: 24,
        zIndex: 20,
    },
    resultsInner: {
        gap: 36,
    },
    resultsDescription: {
        color: "white",
        fontWeight: "200",
        fontSize: 22,
        lineHeight: 30,
    },
    frequencyLine: {
        color: "white",
        fontWeight: "300",
        fontSize: 26,
    },
    saveRow: {
        width: "100%",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    nameInput: {
        backgroundColor: "rgba(255,255,255,0.06)",
        color: "white",
        padding: 16,
        paddingVertical: 8,
        borderRadius: 120,
        flex: 1,
        fontSize: 22,
    },
    calcLabel: {
        fontSize: 18,
        fontWeight: "600",
        color: "rgba(255,255,255,0.65)",
        textAlign: "center",
        marginTop: 10,
        letterSpacing: 0.3,
    },
});
