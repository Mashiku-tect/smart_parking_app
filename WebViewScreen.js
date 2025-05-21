import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const WebViewScreen = () => {
  return <WebView source={{ uri: "https://udom.ac.tz" }} />;
};

export default WebViewScreen;
