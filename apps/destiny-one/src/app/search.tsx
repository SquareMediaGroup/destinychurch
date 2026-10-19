// Search opened from inside a chat (or its Group info): full screen, Cancel
// goes back. ?groupId=… searches that chat first.

import { useLocalSearchParams } from "expo-router";
import { SearchView } from "@/components/SearchView";

export default function Search() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return <SearchView mode="modal" groupId={groupId} />;
}
