import React from "react";
import {ImageBackground, StyleSheet, Text, View} from "react-native";
import {GlassView} from "expo-glass-effect";
import {styles} from "./theme";
// @ts-ignore
import Pod from "@/assets/images/pod.svg"
import {Button, Host} from '@expo/ui/swift-ui';

import {glassEffect, padding,} from "@expo/ui/swift-ui/modifiers";
import {useRouter} from "expo-router";
import {IconSymbol} from "@/expo-template-default-main/components/ui/icon-symbol";

export default function HomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>

            <ImageBackground
                source={require("@/assets/images/gradient.png")}
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
                        <GlassView style={[localStyles.glassBox]} tintColor={'rgba(50,50,50,.7)'}
                                   glassEffectStyle="clear">
                            <View style={[localStyles.glassBoxBox]}>
                                <Host style={{
                                    width: '100%',
                                    height: '100%'
                                }}>
                                    <Button
                                        onPress={() => {
                                            router.push('/device')
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
                                                        <Text style={[localStyles.text, localStyles.headline]}>Den
                                                            1</Text>
                                                        <Text
                                                            style={[localStyles.text, localStyles.subheadline, localStyles.greyed]}>Acoustic
                                                            Pod</Text>
                                                    </View>


                                                    <GlassView style={localStyles.hertzTag}>
                                                        <IconSymbol size={28} color={'white'} name="waveform.path"/>
                                                        <Text
                                                            style={[localStyles.text, localStyles.footnote]}>132.7Hz</Text>
                                                    </GlassView>
                                                </View>

                                            </View>
                                            <IconSymbol style={{}} size={30} name={'chevron.forward'} color={'white'}/>
                                        </View>


                                    </Button>
                                </Host>
                            </View>
                        </GlassView>

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
    text: {
        color: "#fff",
    },
});