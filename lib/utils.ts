import AsyncStorage from "@react-native-async-storage/async-storage";

export const loadData = async (type: string) => {
    try {
        const json = await AsyncStorage.getItem(type);
        return json ? JSON.parse(json) : null;
    } catch (e) {
        console.error('Failed to load profile', e);
        return null;
    }
};

export const saveData = async (name: string, data: any) => {
    try {
        await AsyncStorage.setItem(name, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save profile', e);
    }
};
