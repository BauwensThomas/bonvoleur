import { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Champ mot de passe avec bouton "oeil" pour afficher/masquer la saisie -
// equivalent React Native de components/PasswordInput.tsx (site web).
export default function PasswordField(props: Omit<TextInputProps, "secureTextEntry">) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[props.style, styles.input]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        style={styles.eyeButton}
      >
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
  },
});
