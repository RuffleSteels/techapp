import {Stack} from "expo-router";
import {StatusBar, View} from "react-native";
import {SafeAreaProvider} from "react-native-safe-area-context";
import React from "react";
import {AnimationProvider} from "@/app/components/AnimationContext";

export default function RootLayout() {
    return (
        <AnimationProvider>
            <SafeAreaProvider>
                <View style={{flex: 1, backgroundColor: "#121212"}}>
                    <StatusBar barStyle="light-content" backgroundColor="#121212"/>

                    <Stack
                        screenOptions={{
                            headerTintColor: '#fff',
                            headerTitleStyle: {
                                fontWeight: 'bold',
                            },
                            contentStyle: {backgroundColor: "#121212"}
                        }}
                    >
                        <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                        <Stack.Screen name="pairing" options={{headerShown: false}}/>


                    </Stack>
                </View>
            </SafeAreaProvider>
        </AnimationProvider>

    );
}