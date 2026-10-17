// Search tab. The file isn't called search.tsx because /search is already the
// full-screen search that chats open (src/app/search.tsx).

import { SearchView } from "@/components/SearchView";

export default function SearchTab() {
  return <SearchView mode="tab" />;
}
