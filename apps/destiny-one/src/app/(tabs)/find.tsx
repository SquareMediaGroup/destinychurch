// Search tab. The file isn't called search.tsx because /search is already the
// full-screen search that chats open (src/app/search.tsx).

import { withTabBarInsets } from "@/components/ScreenInsets";
import { SearchView } from "@/components/SearchView";

function SearchTab() {
  return <SearchView mode="tab" />;
}

// Its own insets, so they include the tab bar wherever it is (the side, on iPhone Duo).
export default withTabBarInsets(SearchTab);
