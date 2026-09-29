// B4 Message actions: press and hold a message and iOS shows its own context
// menu (the same one Messages uses). The bubble lifts, a row of quick
// reactions sits on top, and Reply / Copy / Report / Block / Delete list
// underneath. It is drawn and animated by the system, so it follows Reduce
// Motion, Dark Mode and Dynamic Type without us doing anything.

import type { ReactElement } from "react";
import { Button, ContextMenu, ControlGroup, Host, RNHostView, Section } from "@expo/ui/swift-ui";
import type { LocalMessage } from "@/lib/useConversation";

// Reactions are member content, like message text. These five are the
// design's quick row; the server accepts any short emoji.
export const QUICK_REACTIONS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F64F}", "\u{1F602}", "\u{1F389}"];

export interface MessageMenuActions {
  canDelete: boolean;
  onReact: (emoji: string) => void;
  onReply: (() => void) | null;
  onCopy: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
}

export function MessageMenu({ message: m, actions, children }: { message: LocalMessage; actions: MessageMenuActions; children: ReactElement }) {
  const theirs = !m.mine;
  return (
    <Host matchContents>
      <ContextMenu>
        <ContextMenu.Items>
          <ControlGroup>
            {QUICK_REACTIONS.map((e) => (
              <Button key={e} label={e} onPress={() => actions.onReact(e)} />
            ))}
          </ControlGroup>
          <Section>
            {actions.onReply ? <Button label="Reply" systemImage="arrowshape.turn.up.left" onPress={actions.onReply} /> : null}
            {m.body ? <Button label="Copy" systemImage="doc.on.doc" onPress={actions.onCopy} /> : null}
          </Section>
          {theirs || actions.canDelete ? (
            <Section>
              {theirs ? <Button label="Report" systemImage="flag" role="destructive" onPress={actions.onReport} /> : null}
              {theirs && m.sender ? <Button label={`Block ${m.sender.displayName.split(" ")[0]}`} systemImage="hand.raised" role="destructive" onPress={actions.onBlock} /> : null}
              {actions.canDelete ? <Button label="Delete" systemImage="trash" role="destructive" onPress={actions.onDelete} /> : null}
            </Section>
          ) : null}
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>{children}</RNHostView>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
