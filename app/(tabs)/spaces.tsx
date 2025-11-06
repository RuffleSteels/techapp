import React from "react";
import {
    ImageBackground,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from "react-native";
import {styles} from "../../lib/theme";
import {Button, Host} from "@expo/ui/swift-ui";
import {glassEffect, padding} from "@expo/ui/swift-ui/modifiers";
import {GlassView} from "expo-glass-effect";
import CubeThing from "../components/CubeThing";
import {useFocusEffect} from '@react-navigation/native';
import * as Haptics from "expo-haptics";

const colourKey: Record<number, string> = {
    0: '#D0B830',
    1: '#30D0D0',
    2: '#D030C8',
};

const dimss = [
    {
        name: 'Length',
        value: '0'
    },
    {
        name: 'Width',
        value: '0'
    },
    {
        name: 'Height',
        value: '0'
    }
]

export default function HomeScreen() {
    const [dims, setDims] = React.useState(dimss)
    const [nameModal, setNameModal] = React.useState(false)
    const [name, setName] = React.useState('')
    const [triggerAnim, setTriggerAnim] = React.useState(false)


    useFocusEffect(
        React.useCallback(() => {

            return () => {
                setTimeout(() => {
                    setDims(prev => {
                        const newDims = [...prev]
                        newDims[0].value = '0'
                        newDims[1].value = '0'
                        newDims[2].value = '0'
                        return newDims
                    })
                }, 200)

                setTriggerAnim(false)
            };
        }, [])
    );

    return (
        <>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>

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
                        <View style={[localStyles.wrapper, {gap: 32}]}>
                            <View style={localStyles.titleContainer}>
                                <View style={localStyles.titleBox}>
                                    <Text style={[localStyles.text, localStyles.largeTitle]}>Calculate Spaces</Text>
                                </View>
                                <Text style={[localStyles.text, localStyles.body]}><Text
                                    style={[localStyles.text, localStyles.headline]}>Enter the dimensions of the space
                                    you will
                                    put the pod in.{' '}</Text>This will calculate the likely frequencies which will
                                    resonate in
                                    the room, saving them as a room preset.</Text>
                            </View>

                            <View style={{
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'flex-end'
                            }}>
                                <View style={{flexDirection: 'column', width: '50%', gap: 32}}>

                                    {
                                        dimss.map((item, i) => (
                                            <View key={i} style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 32,
                                                justifyContent: 'space-between',
                                                width: '100%'
                                            }}>
                                                <View>
                                                    <Text style={[localStyles.text, {
                                                        fontSize: 22,
                                                        fontWeight: '600',


                                                    }]}>
                                                        {item.name}:
                                                    </Text>
                                                    <View
                                                        style={{
                                                            position: 'absolute',
                                                            left: 0,
                                                            bottom: 0,
                                                            height: 3,                 // thickness of underline
                                                            width: '100%',                 // desired underline width
                                                            backgroundColor: colourKey[i],
                                                            marginTop: 2,              // space between text and underline
                                                        }}
                                                    />
                                                </View>

                                                <View style={[localStyles.glassBox, {
                                                    width: 'auto',
                                                    height: 'auto',

                                                }]}>
                                                    <View style={[{
                                                        width: '100%',
                                                    }]}>
                                                        <Host style={{
                                                            width: '100%',
                                                        }}>
                                                            <Button
                                                                onPress={() => {
                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

                                                                }}
                                                                variant="plain"
                                                                modifiers={[
                                                                    glassEffect({
                                                                        glass: {
                                                                            variant: 'clear',
                                                                            interactive: true,
                                                                        },
                                                                        shape: 'capsule',
                                                                    }),
                                                                ]}
                                                            >
                                                                <View style={[{
                                                                    alignItems: 'center',
                                                                    paddingHorizontal: 12,
                                                                    paddingVertical: 8
                                                                }]}>
                                                                    <TextInput
                                                                        placeholder="___"
                                                                        placeholderTextColor="#aaa"
                                                                        value={(parseFloat(dims[i].value) === 0 ? '__' : dims[i].value) + 'm'}
                                                                        inputMode={'decimal'}
                                                                        onChangeText={(text) => {
                                                                            const textt = text.replace('m', '').replaceAll('_', '')
                                                                            if (/^[0-9]*\.?[0-9]*$/.test(textt)) {
                                                                                setDims(prev => {
                                                                                    const newDims = [...prev]
                                                                                    newDims[i].value = textt ? textt : '0'
                                                                                    return newDims
                                                                                })
                                                                            }
                                                                        }}
                                                                        selection={{
                                                                            start: (dims[i].value + 'm').length - 1,
                                                                            end: (dims[i].value + 'm').length - 1
                                                                        }}

                                                                        style={{
                                                                            color: 'white',
                                                                            width: '100%',
                                                                            // padding: 10,
                                                                            fontSize: 24,
                                                                            fontWeight: '300'
                                                                        }}
                                                                    />
                                                                </View>

                                                            </Button>
                                                        </Host>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    }


                                </View>
                                <View style={{justifyContent: 'flex-end', alignItems: 'flex-end', width: '50%'}}>
                                    <Host>
                                        <Button
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                                                setTriggerAnim(true)
                                                // setNameModal(true)
                                            }}
                                            disabled={parseFloat(dims[0].value) === 0 || parseFloat(dims[1].value) === 0 || parseFloat(dims[2].value) === 0}
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
                                                paddingRight: 14,
                                                fontSize: 22
                                            }]}>
                                                Create
                                            </Text>

                                        </Button>
                                    </Host>
                                </View>
                            </View>
                        </View>
                        <CubeThing dims={dims} setTriggerAnim={setTriggerAnim} setDims={setDims}
                                   triggerAnim={triggerAnim}/>
                    </ImageBackground>
                </View>
            </TouchableWithoutFeedback>

            <Modal
                animationType="fade"
                transparent={true}
                visible={nameModal}
                onRequestClose={() => setNameModal(false)}
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

                        setNameModal(false)
                        setName('')
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
                                Create New Space
                            </Text>

                            <View style={{width: '100%', gap: 12}}>
                                <TextInput
                                    placeholder="Name"
                                    placeholderTextColor="#aaa"
                                    value={name}
                                    autoFocus={true}
                                    inputMode={'text'}
                                    maxLength={15}

                                    onChangeText={setName}
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
                                    const newRoom = {
                                        name: name,
                                        length: [parseFloat(dims[0].value), 100],
                                        width: [parseFloat(dims[1].value), 100],
                                        height: [parseFloat(dims[2].value), 100],
                                        id: 0
                                    }
                                    setTriggerAnim(true)
                                    setName('')
                                    setNameModal(false)
                                }} variant={'glass'}>
                                    Create
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
    wrapper: {
        width: "100%",
        height: "100%",

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
        paddingHorizontal: 16,
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
    body: {
        fontSize: 17,
        fontWeight: 'semibold'
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