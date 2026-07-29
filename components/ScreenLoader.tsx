import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function ScreenLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#0ea5e9" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});
