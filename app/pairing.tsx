import React, {useState} from "react";
import {ActivityIndicator, ImageBackground, StyleSheet, Text, View} from "react-native";
import {styles} from "./(tabs)/theme";
import {useRouter} from "expo-router";
import {Button, Host} from '@expo/ui/swift-ui';
import {GlassView} from "expo-glass-effect";

// @ts-ignore
import Pod from "@/assets/images/pod.svg";
import {IconSymbol} from "@/expo-template-default-main/components/ui/icon-symbol";

export default function Pairing() {
    const router = useRouter();

    const [failed, setFailed] = useState(false)

    const devices = [{
        name: 'Acoustic Pod'
    }]

    return (
        <View style={styles.container}>
            <ImageBackground
                source={require("@/assets/images/gradient.png")}
                style={[styles.background, {}]}
                //@ts-ignore
                imageStyle={{
                    filter: 'brightness(0.14)',
                }}
                resizeMode="cover"
            >
                <View style={localStyles.wrapper}>
                    <View style={{gap: 48}}>
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
                                    <GlassView key={i} style={[localStyles.glassBox]} tintColor={'rgba(50,50,50,.7)'}
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


                    <View style={{
                        gap: 48,
                    }}>
                        {
                            failed ?
                                <View>

                                </View>
                                :
                                <View style={{
                                    flexDirection: 'row',
                                    gap: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ActivityIndicator size="large" style={{}} color="#ffffff"/>
                                    <Text style={[localStyles.text, localStyles.body, localStyles.greyed]}>
                                        Searching...
                                    </Text>
                                </View>
                        }


                        <View style={{width: '100%', alignItems: 'center'}}>
                            <View style={{
                                gap: 16,
                                width: '100%',
                                // alignItems: 'center'
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
        paddingHorizontal: 16,
        paddingVertical: 72,
        paddingBottom: 32,
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
