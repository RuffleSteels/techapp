import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black", // change to any color
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        width: '100%',
        minHeight: '100%',
        display: "flex",
    },
    background: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
    },

    text: {
        color: "white",
        fontSize: 20,
    },
});