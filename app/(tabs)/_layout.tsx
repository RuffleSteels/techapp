import {Icon, Label, NativeTabs} from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
    return (
        <NativeTabs
        >
            <NativeTabs.Trigger name="index">
                <Label>Home</Label>
                <Icon sf="house.fill" drawable="ic_menu_home"/>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="spaces">
                <Label>Spaces</Label>
                <Icon sf="rectangle.3.offgrid.fill" drawable="ic_menu_view"/>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}