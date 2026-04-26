import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useAnimation } from "../components/AnimationContext";
import { View } from "react-native";
import React from "react";

export default function TabsLayout() {
    const { animationRunning } = useAnimation();

    return (
        <View style={{ flex: 1 }}>
            <NativeTabs>
                <NativeTabs.Trigger name="index">
                    <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="spaces">
                    <NativeTabs.Trigger.Label>Spaces</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon sf="rectangle.3.offgrid.fill" md="grid_view" />
                </NativeTabs.Trigger>
            </NativeTabs>

            {animationRunning && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                    }}
                />
            )}
        </View>
    );
}