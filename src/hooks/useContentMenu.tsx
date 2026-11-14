import { useState } from "react";
import { Alert } from "react-native";
import {
  ActionSheet,
  ActionSheetConfig,
  ActionSheetOption,
} from "../components/ActionSheet";
import {
  BlockedUser,
  blockUser,
  REPORT_REASONS,
  ReportTarget,
  submitReport,
} from "../lib/moderation";

const TARGET_NOUN: Record<ReportTarget["type"], string> = {
  post: "post",
  comment: "comment",
  user: "collector",
};

// The "…" menu for content someone else made: Report, Block, plus any
// screen-specific options. Render `sheet` once anywhere in the screen and
// call `open(...)` from a button.
//
// `onBlocked` runs after a successful block so the screen can hide that
// person's content right away.
export function useContentMenu(onBlocked?: (userId: string) => void) {
  const [config, setConfig] = useState<ActionSheetConfig | null>(null);

  const openReportReasons = (target: ReportTarget) => {
    setConfig({
      title: `Why are you reporting this ${TARGET_NOUN[target.type]}?`,
      options: REPORT_REASONS.map((reason) => ({
        label: reason,
        onPress: async () => {
          try {
            await submitReport(target, reason);
            Alert.alert(
              "Thanks for letting us know",
              "We'll review this report. You can also block this collector to stop seeing their content.",
            );
          } catch (error) {
            console.error("Error sending report:", error);
            Alert.alert("Couldn't send report", "Please try again.");
          }
        },
      })),
    });
  };

  const confirmBlock = (user: BlockedUser) => {
    Alert.alert(
      `Block ${user.displayName}?`,
      "You won't see their posts, comments or collection, and you'll unfollow them. They won't be notified. You can unblock them in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(user);
              onBlocked?.(user.id);
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Couldn't block", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const open = ({
    target,
    user,
    extraOptions = [],
  }: {
    target: ReportTarget;
    user: BlockedUser;
    extraOptions?: ActionSheetOption[];
  }) => {
    setConfig({
      options: [
        ...extraOptions,
        {
          label: `Report ${TARGET_NOUN[target.type]}`,
          onPress: () => openReportReasons(target),
        },
        {
          label: `Block ${user.displayName}`,
          destructive: true,
          onPress: () => confirmBlock(user),
        },
      ],
    });
  };

  // For your own content (e.g. just "Delete comment").
  const openOptions = (options: ActionSheetOption[]) => setConfig({ options });

  const sheet = <ActionSheet config={config} onClose={() => setConfig(null)} />;

  return { open, openOptions, sheet };
}
