// A day-and-time picker for scheduling. iPhone shows two compact pickers (day,
// time) side by side; Android opens its own dialogs, day first then time, as
// the platform has no combined one. Whatever is picked is clamped into the
// allowed window, so the value is always one the server will take.

import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/tokens";

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function clamp(d: Date, min: Date, max: Date): Date {
  return new Date(Math.min(Math.max(d.getTime(), min.getTime()), max.getTime()));
}

export function WhenPicker({ value, onChange, minimumDate, maximumDate, label = "Send at" }: { value: Date; onChange: (d: Date) => void; minimumDate: Date; maximumDate: Date; label?: string }) {
  const t = useTheme();

  /** Keeps the day and takes the time (or the other way round). */
  const merge = (day: Date, time: Date) => clamp(new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes(), 0, 0), minimumDate, maximumDate);

  if (Platform.OS === "ios") {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 17, color: t.text }}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <DateTimePicker mode="date" display="compact" value={value} minimumDate={minimumDate} maximumDate={maximumDate} onChange={(_e, d) => d && onChange(merge(d, value))} accessibilityLabel="Day" />
          <DateTimePicker mode="time" display="compact" value={value} onChange={(_e, d) => d && onChange(merge(value, d))} accessibilityLabel="Time" />
        </View>
      </View>
    );
  }

  const open = (mode: "date" | "time") =>
    DateTimePickerAndroid.open({
      value,
      mode,
      is24Hour: true,
      minimumDate: mode === "date" ? minimumDate : undefined,
      maximumDate: mode === "date" ? maximumDate : undefined,
      onChange: (e: DateTimePickerEvent, d?: Date) => {
        if (e.type !== "set" || !d) return;
        onChange(mode === "date" ? merge(d, value) : merge(value, d));
      },
    });

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 17, color: t.text }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Day, ${DAY.format(value)}`} onPress={() => open("date")} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.fill }}>
          <Text style={{ fontSize: 17, color: t.text }}>{DAY.format(value)}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Time, ${TIME.format(value)}`} onPress={() => open("time")} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.fill }}>
          <Text style={{ fontSize: 17, color: t.text }}>{TIME.format(value)}</Text>
        </Pressable>
      </View>
    </View>
  );
}
