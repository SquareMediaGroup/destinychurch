// Launch gate: waits for the stored session, then sends the member wherever
// the server says they belong (routeFor).

import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { ErrorState } from "@/components/ui";
import { routeFor, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function Index() {
  const { ready, session, me, refreshMe } = useSession();
  const [retrying, setRetrying] = useState(false);
  const t = useTheme();

  if (ready && session && !me && !retrying) {
    // Signed in, but the server couldn't be reached.
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: t.bg }}>
        <ErrorState
          message="Couldn't reach Destiny One. Check your connection and try again."
          onRetry={() => {
            setRetrying(true);
            void refreshMe().finally(() => setRetrying(false));
          }}
        />
      </View>
    );
  }
  if (!ready || (session && !me)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  }
  return <Redirect href={session ? routeFor(me) : "/welcome"} />;
}
