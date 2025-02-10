import { LockIcon, CircleAlert, CircleHelp, TriangleAlert, BookOpenText, BadgeInfo, Bell } from "lucide-react";

export function CalloutIcon({color} : {color: string}) {

    return (
          (() => {
            const iconStyle = "text-white";
                switch (color.split("-")[1]) {
                    case 'red':
                        return <TriangleAlert className={iconStyle} strokeWidth={2.5}/>;
                    case 'blue':
                      return <CircleHelp className={iconStyle} strokeWidth={2.5}/>
                    case 'orange':
                      return <CircleAlert className={iconStyle} strokeWidth={2.5}/>
                    case 'green':
                      return <BookOpenText className={iconStyle} strokeWidth={2.5}/>
                    case 'purple':
                      return <BadgeInfo className={iconStyle} strokeWidth={2.5}/>
                    default:
                        return <Bell className={iconStyle} strokeWidth={2.5}/>;
                }
            })()
      );

}