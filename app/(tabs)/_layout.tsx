import {Icon, Label, NativeTabs} from "expo-router/unstable-native-tabs";
import {useAnimation} from "@/app/components/AnimationContext";
import {View} from "react-native";

export default function TabsLayout() {
    const {animationRunning} = useAnimation();

    return (
        <View style={{flex: 1}}>
            <NativeTabs>
                <NativeTabs.Trigger name="index">
                    <Label>Home</Label>
                    <Icon sf="house.fill" drawable="ic_menu_home"/>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="spaces">
                    <Label>Spaces</Label>
                    <Icon sf="rectangle.3.offgrid.fill" drawable="ic_menu_view"/>
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