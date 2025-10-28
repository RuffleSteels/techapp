// CubeThing.tsx
import React, { useEffect, useRef, useState } from "react";
import {Dimensions, StyleSheet, View, Text, TextInput, KeyboardAvoidingView, Keyboard} from "react-native";
import WireframeCuboid from "@/app/components/Cuboid";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    runOnJS,
} from "react-native-reanimated";
import {BlurView} from "expo-blur";
import {Button, Host} from "@expo/ui/swift-ui";
import * as Haptics from "expo-haptics";
import {glassEffect, padding} from "@expo/ui/swift-ui/modifiers";
import {loadData, saveData} from "@/lib/utils";
import {useAnimation} from "@/app/components/AnimationContext";
function findFirstMissingId(items: any): number {
    const ids = new Set(items.map(item => item.id));
    let i = 0;
    while (ids.has(i)) {
        i++;
    }
    return i;
}
export default function CubeThing({ setDims,triggerAnim,setTriggerAnim,dims }) {
    // const [triggerAnim, setTriggerAnim] = useState(false);
    const [stage, setStage] = useState(0); // 0 = idle, 1 = accelerate, 2 = final stop
    const [name, setName] = useState('')
    const { setAnimationRunning } = useAnimation();
    const before = { x: 0, y: 30, z: 0 };
    const mid = { x: 450, y: 500, z: 0 };
    const stop = { x: 0, y: 0, z: 0 }; // final: no rotation speeds

    const stopAngle = { x: 20, y: -45, z: 0 }; // target final orientation

    const [speed, setSpeed] = useState(before);
    const current = useRef({ ...before });
    const cubeY = useSharedValue(232);
    const opacity = useSharedValue(0);
    const fihal = useSharedValue(0);
    const top = useSharedValue(-12);
    const scrollRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });

        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);
    useEffect(() => {
        if (!triggerAnim) {
            top.value = withTiming(-12, { duration: 100 })
            return;
        }
        top.value = withTiming(-3000, { duration: 800 })
    },[top, triggerAnim])

    useEffect(() => {
        if (!triggerAnim || stage !== 1) {
            opacity.value = withTiming(0, { duration: 800 })
            return;
        }
        opacity.value = withTiming(1.0, { duration: 800 })
    },[opacity, stage, triggerAnim])
    useEffect(() => {
        if (!triggerAnim || stage !== 2) {
            fihal.value = withTiming(0, { duration: 400 })
            return;
        }
        setTimeout(() => {
            setAnimationRunning(false)
            fihal.value = withTiming(1.0, { duration: 800 })
        }, 1000)

    },[fihal, stage, triggerAnim])

    useEffect(() => {
        setName('')
        if (!triggerAnim) {
            cubeY.value = withTiming(232, { duration: 300 });
            setStage(0);
            setAnimationRunning(false)
            return;
        }

        (setStage)(1)
        // Stage 1: go to half height and accelerate
        setAnimationRunning(true)
        cubeY.value = withTiming(
            Dimensions.get("window").height / 2 + 48,
            { duration: 800 },
            (finished) => {
                // if (finished) runOnJS(setStage)(1);
                // Automatically go to stage 2 after a moment
                setTimeout(() => runOnJS(setStage)(2), 2000);
            }
        );
    }, [triggerAnim]);

    // Rotation speed interpolation
    useEffect(() => {
        const duration = stage === 2 ? 1800 : 1200;
        const start = performance.now();
        const from = { ...current.current };
        const to = stage === 1 ? mid : stage === 2 ? stop : before;

        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
            current.current = {
                x: from.x + (to.x - from.x) * ease,
                y: from.y + (to.y - from.y) * ease,
                z: from.z + (to.z - from.z) * ease,
            };
            setSpeed({ ...current.current });
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [stage]);

    // Stage 2: final move to top
    useEffect(() => {
        if (stage === 2) {
            cubeY.value = withTiming(Dimensions.get("window").height-200, {
                duration: 1800,
            });
        }
    }, [stage]);

    const cubeStyle = useAnimatedStyle(() => ({
        bottom: cubeY.value,
    }));

    const opacityStyle = useAnimatedStyle(() => ({
        top: top.value
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));
    const finalStyle = useAnimatedStyle(() => ({
        opacity: fihal.value,
    }));

    const height = parseFloat(dims[2].value) || 1.5;
    const width = parseFloat(dims[0].value) || 3;
    const depth = parseFloat(dims[1].value) || 2;

    return (
            <Animated.View
                style={[styles.container, cubeStyle, {
                    paddingBottom:(keyboardHeight === 0 ) ? 0 : keyboardHeight + 100,
                }]}
            >
                <Animated.View style={[{
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    zIndex: 10000,
                    height: Dimensions.get("window").height,
                    // backgroundColor: 'red',
                    paddingHorizontal: 32,
                    paddingBottom: 160,
                    paddingTop: 290
                }, finalStyle]}>
                    <View
                        behavior={"padding"}

                        keyboardVerticalOffset={100} style={{
                        // backgroundColor: 'blue',
                        // paddingBottom0
                        width: '100%',
                        height: '100%',
                        gap: 48
                    }}>

                        <View style={{gap:32}}>
                            <Text style={{
                                color: 'white',
                                fontWeight: '200',
                                fontSize: 25
                            }}>
                                For each dimension of your space, the following frequencies have been calculated as likely to resonate. Using these could improve the sound in your space.
                            </Text>

                            <View style={{
                                gap: 24
                            }}>
                                <Text style={{
                                    color: 'white',
                                    fontWeight: '300',
                                    fontSize: 26
                                }}>
                                    Length: 100.0Hz
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    fontWeight: '300',
                                    fontSize: 26
                                }}>
                                    Width: 140.2Hz
                                </Text>
                                <Text style={{
                                    color: 'white',
                                    fontWeight: '300',
                                    fontSize: 26
                                }}>
                                    Height: 132.5Hz
                                </Text>
                            </View>

                        </View>


                        <View style={{
                            width: '100%',
                            alignItems: 'flex-end',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            gap: 16
                        }}>
                            <TextInput
                                placeholder="Enter a name..."
                                placeholderTextColor="#aaa"
                                value={name}
                                autoFocus={false}
                                inputMode={'text'}
                                maxLength={15}

                                onChangeText={setName}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    padding: 12,
                                    paddingVertical: 7,
                                    borderRadius: 120,
                                    flex: 1,
                                    // padding: 10,
                                    fontSize: 22,
                                }}
                            />
                            <Host style={{
                                width: 148
                            }}>
                                <Button onPress={ async () => {
                                    if (name) {
                                        const devices = await loadData('devices')
                                        const rooms = await loadData('rooms')
                                        const id = findFirstMissingId(rooms)
                                        const newRoom = {
                                            name: name,
                                            length: [parseFloat(dims[0].value), 100],
                                            width: [parseFloat(dims[1].value), 100],
                                            height: [parseFloat(dims[2].value), 100],
                                            id
                                        }

                                        devices.map((item) => {
                                            item.currentDimension[id] = 0
                                        })

                                        rooms.push(newRoom)

                                        await saveData('devices', devices)
                                        await saveData('rooms', rooms)

                                        setTimeout( ()=> {
                                            setDims(prev => {
                                                const newDims = [...prev]
                                                newDims[0].value = '0'
                                                newDims[1].value = '0'
                                                newDims[2].value = '0'
                                                return newDims
                                            })
                                            setName('')
                                        }, 100)

                                        setTriggerAnim(false)
                                    }
                                }} role="default"
                                        variant="plain"
                                        modifiers={[
                                            padding({
                                                // all: 4,
                                            }),
                                            glassEffect({
                                                glass: {
                                                    variant: 'regular',
                                                    interactive: true,
                                                },
                                                shape: 'capsule'
                                            }),
                                        ]}
                                        color={'rgba(100,100,100,0.3)'}>
                                    <View style={{
                                        backgroundColor: 'rgba(100,100,100,0.3)',
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        alignSelf: 'center',
                                        borderRadius: 18,

                                    }}>
                                        <Text style={[{
                                            fontWeight: '500',
                                            fontSize: 22,
                                            color:'white'
                                        }]}>
                                            Save Space
                                        </Text>
                                    </View>
                                </Button>

                            </Host>
                        </View>

                    </View>

                </Animated.View>
                <WireframeCuboid
                    width={width * 40}
                    height={height * 40}
                    depth={depth * 40}
                    size={300}
                    rotationSpeedX={speed.x}
                    rotationSpeedY={speed.y}
                    rotationSpeedZ={speed.z}
                    // this ensures the cube blends toward its final resting orientation
                    targetAngleX={stage === 2 ? stopAngle.x : undefined}
                    targetAngleY={stage === 2 ? stopAngle.y : undefined}
                    targetAngleZ={stage === 2 ? stopAngle.z : undefined}
                />
                <Animated.Text style={[{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: 'white',
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    width: '100%',
                    textAlign: 'center',
                    zIndex: 1000,
                }, textStyle]}>
                    Calculating frequencies...
                </Animated.Text>
                <Animated.View
                    style={[{
                        width: '100%',
                        height: 10000,
                        backgroundColor: 'rgba(0,0,0,.5)',
                        boxShadow: 'inset 0 15px 20px -10px rgba(0,0,0,0.5)',
                        position: 'absolute',
                        top: -12,
                        left: 0
                    }, opacityStyle]}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill}/>
                </Animated.View>
                {/*</KeyboardAvoidingView>*/}
            </Animated.View>
        // </View>


    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        width: "100%",
        transform: [{ translateY: "50%" }],
        position: "absolute",
        bottom: 212,
        left: 0,
    },
});