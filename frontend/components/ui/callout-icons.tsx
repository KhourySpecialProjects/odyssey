import {
  CircleAlert,
  CircleHelp,
  TriangleAlert,
  BookOpenText,
  BadgeInfo,
  Bell,
} from "lucide-react";

export function CalloutIcon({ color }: { color: string }) {
  return (() => {
    const iconStyle = "text-black";
    switch (color.split("-")[1]) {
      case "red":
        return <TriangleAlert className={iconStyle} />;
      case "blue":
        return <CircleHelp className={iconStyle} />;
      case "orange":
        return <CircleAlert className={iconStyle} />;
      case "green":
        return <BookOpenText className={iconStyle} />;
      case "purple":
        return <BadgeInfo className={iconStyle} />;
      case "amber":
        return <Bell className={iconStyle} />;
      default:
        return <div />;
    }
  })();
}
