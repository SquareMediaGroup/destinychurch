// C4 Edit / archive group (leaders and group admins).

import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bone, CardButton, ConfirmDialog, Field, FieldLabel, FormError, ModalHeader, PrimaryButton, SkeletonGroup } from "@/components/ui";
import { api } from "@/lib/api";
import { removeGroupLocally, setGroup, updateGroupSummary, useGroup } from "@/lib/queries";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function EditGroup() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupQuery = useGroup(id);
  const group = groupQuery.data ?? null;
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the form once, from the cached group (or the fetch, if not cached).
  const filled = useRef(false);
  useEffect(() => {
    if (group && !filled.current) {
      filled.current = true;
      setName(group.name);
      setDepartment(group.department ?? "");
      setDescription(group.description ?? "");
    }
  }, [group]);
  // A failed load shows until the group arrives; save errors take priority.
  const shownError = error ?? (groupQuery.error && !group ? errorMessage(groupQuery.error) : null);

  async function save(archived?: boolean) {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateGroup(id, archived ? { archived: true } : { name: name.trim(), department: department.trim() || null, description: description.trim() || null });
      if (archived) {
        router.dismissTo("/chats");
        removeGroupLocally(id);
        return;
      }
      setGroup(updated);
      updateGroupSummary(id, (g) => ({ ...g, name: updated.name, department: updated.department }));
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setArchiving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Edit group" icon="back" />
      {!group && !shownError ? (
        <SkeletonGroup label="Loading group" style={{ gap: 20, paddingTop: 14, flex: 1 }}>
          {[52, 52, 80].map((h, i) => (
            <View key={i} style={{ gap: 8 }}>
              <Bone width={90} height={12} style={{ marginLeft: 4 }} />
              <Bone height={h} radius={16} style={{ backgroundColor: t.card }} />
            </View>
          ))}
        </SkeletonGroup>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            <FieldLabel>Name</FieldLabel>
            <Field value={name} onChangeText={setName} background={t.card} />
          </View>
          <View style={{ gap: 8 }}>
            <FieldLabel optional>Department</FieldLabel>
            <Field value={department} onChangeText={setDepartment} placeholder="e.g. Media" background={t.card} />
          </View>
          <View style={{ gap: 8 }}>
            <FieldLabel optional>Description</FieldLabel>
            <Field value={description} onChangeText={setDescription} placeholder="What's this group for?" multiline background={t.card} />
          </View>
          <FormError message={shownError} />
          {group ? <CardButton label="Archive group" onPress={() => setArchiving(true)} /> : null}
        </ScrollView>
      )}
      <PrimaryButton label="Save" onPress={() => save()} busy={busy && !archiving} disabled={!group || !name.trim()} style={{ marginTop: 14 }} />
      <ConfirmDialog
        visible={archiving}
        title="Archive this group?"
        body="Hides it for everyone. Messages are kept for safeguarding."
        confirmLabel="Archive"
        busy={busy}
        onCancel={() => setArchiving(false)}
        onConfirm={() => save(true)}
      />
    </View>
  );
}
