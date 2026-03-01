import {Stack} from "expo-router";
import {StatusBar, View} from "react-native";
import {SafeAreaProvider} from "react-native-safe-area-context";
import React from "react";
import AnimationProvider from "./components/AnimationContext";
import {BLEProvider} from "../lib/BLEProvider";

export default function RootLayout() {
    return (
        <BLEProvider>
            <AnimationProvider>
                <SafeAreaProvider>
                    <View style={{flex: 1, backgroundColor: "#121212"}}>
                        <StatusBar barStyle="light-content" backgroundColor="#121212"/>
                        <Stack
                            screenOptions={{
                                headerTransparent: true,
                                // headerBlurEffect: 'none',
                                headerBackButtonDisplayMode: 'minimal',
                                // headerTitleStyle: { color: 'transparent' },
                                headerLargeStyle: { backgroundColor: 'transparent' },
                                headerBackButtonMenuEnabled: false,
                                // headerTintColor: 'black',
                                title: '',
                                headerTintColor: '#fff',
                                    headerTitleStyle: {
                                        fontWeight: 'bold',
                                    },
                                    contentStyle: {backgroundColor: "#121212"}
                            }}
                        >
                        {/*<Stack*/}
                        {/*    screenOptions={{*/}
                        {/*        headerTintColor: '#fff',*/}
                        {/*        headerTitleStyle: {*/}
                        {/*            fontWeight: 'bold',*/}
                        {/*        },*/}
                        {/*        contentStyle: {backgroundColor: "#121212"}*/}
                        {/*    }}*/}
                        {/*>*/}
                            <Stack.Screen name="(tabs)" options={{gestureEnabled: false, headerShown: true}}/>
                            <Stack.Screen name="pairing" options={{headerShown: false}}/>


                        </Stack>
                    </View>
                </SafeAreaProvider>
            </AnimationProvider>
        </BLEProvider>


    );
}