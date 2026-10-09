// The in-app camera: a full-screen viewfinder in the app's own style instead
// of the system camera screen. Shutter at the bottom, flash and flip on the
// sides, close at the top. After the shot you review it and either retake or
// use it. The photo is returned through src/lib/camera.ts and then re-encoded
// like every other image (src/lib/cleanImage.ts), so no location leaves the phone.

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, StatusBar, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from "expo-camera";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/Motion";
import { finishCamera } from "@/lib/camera";
import { haptic } from "@/lib/haptics";

export default function Camera() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  // Ask as soon as it opens, unless we already know the answer.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  // However the screen goes away (close, swipe, back), the caller gets an answer.
  useEffect(() => () => {
    if (!done.current) finishCamera(null);
  }, []);

  function close() {
    haptic.selection();
    router.back();
  }

  function use() {
    if (!shot) return;
    haptic.success();
    done.current = true;
    finishCamera(shot);
    router.back();
  }

  async function capture() {
    if (busy || !ready || !camera.current) return;
    setBusy(true);
    setError(null);
    haptic.press();
    try {
      const pic = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      setShot(pic.uri);
    } catch {
      setError("Couldn't take the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const top = Math.max(insets.top, 12) + 4;
  const bottom = Math.max(insets.bottom, 16) + 16;

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: top, paddingBottom: bottom, paddingHorizontal: 32 }}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={24} color="#fff" strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text maxFontSizeMultiplier={1.4} style={{ color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "center" }}>Camera access is off</Text>
          <Text maxFontSizeMultiplier={1.4} style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center" }}>
            Allow the camera to take a photo to send in a chat.
          </Text>
          <Pressable
            onPress={() => (permission.canAskAgain ? void requestPermission() : void Linking.openSettings())}
            accessibilityRole="button"
            style={{ marginTop: 8, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 24, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#000", fontSize: 16, fontWeight: "800" }}>{permission.canAskAgain ? "Allow camera" : "Open Settings"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (shot) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <StatusBar barStyle="light-content" />
        <Image source={{ uri: shot }} resizeMode="contain" style={{ flex: 1 }} />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: bottom, paddingTop: 16, paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Pressable onPress={() => { haptic.selection(); setShot(null); }} accessibilityRole="button" style={{ height: 48, paddingHorizontal: 20, justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Retake</Text>
          </Pressable>
          <Pressable onPress={use} accessibilityRole="button" style={{ height: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: "#fff", justifyContent: "center" }}>
            <Text style={{ color: "#000", fontSize: 17, fontWeight: "800" }}>Use photo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pill = { height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center" as const, justifyContent: "center" as const };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={camera}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        mode="picture"
        onCameraReady={() => setReady(true)}
        onMountError={() => setError("The camera isn't available on this device.")}
      />
      <View style={{ position: "absolute", top, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close camera" style={{ ...pill, width: 40, paddingHorizontal: 0 }}>
          <Icon name="close" size={20} color="#fff" strokeWidth={2.4} />
        </Pressable>
        {facing === "back" ? (
          <Pressable onPress={() => { haptic.selection(); setFlash((f) => (f === "off" ? "on" : "off")); }} accessibilityRole="button" accessibilityLabel={flash === "on" ? "Turn flash off" : "Turn flash on"} style={pill}>
            <Text style={{ color: flash === "on" ? "#FFD60A" : "#fff", fontSize: 14, fontWeight: "800" }}>{flash === "on" ? "Flash on" : "Flash off"}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={{ position: "absolute", top: top + 56, left: 24, right: 24, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", textAlign: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: "hidden" }}>{error}</Text>
        </View>
      ) : null}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: bottom, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 32 }}>
        <View style={{ width: 80 }} />
        <PressableScale onPress={() => void capture()} disabled={!ready || busy} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Take photo" style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center", opacity: ready ? 1 : 0.5 }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff" }} />
        </PressableScale>
        <Pressable onPress={() => { haptic.selection(); setFacing((f) => (f === "back" ? "front" : "back")); setFlash("off"); setReady(false); }} accessibilityRole="button" accessibilityLabel="Switch camera" style={{ ...pill, width: 80, paddingHorizontal: 0 }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800" }}>Flip</Text>
        </Pressable>
      </View>
    </View>
  );
}
