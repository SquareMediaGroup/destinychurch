// Shake the phone to report a problem, as in many apps. Listens only while the
// app is open, someone is signed in and active, and the setting is on; a
// shake asks first (a knock in a bag shouldn't open a form), and never while
// the Report a problem screen is already showing.

import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { router, usePathname } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { createShakeDetector } from "@/lib/shake";
import { shakeToReport, useShakeToReport } from "@/state/shakeToReport";

/** Ten readings a second is plenty to catch a shake, and easy on the battery. */
const INTERVAL_MS = 100;

export function useShakeToReportListener(signedIn: boolean) {
  const enabled = useShakeToReport();
  const pathname = usePathname();
  const onFeedback = useRef(false);
  const asking = useRef(false);

  useEffect(() => {
    onFeedback.current = pathname === "/feedback";
  }, [pathname]);

  useEffect(() => {
    void shakeToReport.load();
  }, []);

  useEffect(() => {
    if (!enabled || !signedIn) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    const detect = createShakeDetector(() => {
      if (asking.current || onFeedback.current) return;
      asking.current = true;
      const done = () => {
        asking.current = false;
      };
      Alert.alert(
        "Report a problem?",
        "You shook your phone. Do you want to tell us about something that isn't working?",
        [
          { text: "Not now", style: "cancel", onPress: done },
          {
            text: "Turn off shake to report",
            onPress: () => {
              done();
              shakeToReport.set(false);
            },
          },
          {
            text: "Report a problem",
            isPreferred: true,
            onPress: () => {
              done();
              router.push({ pathname: "/feedback", params: { kind: "problem" } });
            },
          },
        ],
        { cancelable: true, onDismiss: done },
      );
    });

    void Accelerometer.isAvailableAsync().then((available) => {
      if (!available || cancelled) return;
      Accelerometer.setUpdateInterval(INTERVAL_MS);
      sub = Accelerometer.addListener((reading) => detect(reading, Date.now()));
    });
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, signedIn]);
}
