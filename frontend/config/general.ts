import {
  isAuthorizedUserAdmin,
  isContentCreator,
  isContentEditor,
} from "@/lib/utils";
import { GeneralConfig, User } from "@/types";

export const originalNav = [
  {
    href: "/explore",
    label: "Explore",
  },
];

export const getMainNav = (user: User) => {
  const mainNav = [
    {
      href: "/feed",
      label: "Feed",
    },
    {
      href: "/explore",
      label: "Explore",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
    },
    {
      href: "/g/dashboard?tab=member",
      label: "Groups",
      // isHidden:
      //   !isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/my-content",
      label: "My Content",
      isHidden:
        !isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/review",
      label: "To Review",
      isHidden:
        !isContentEditor(user.roles) && !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/admin",
      label: "Admin",
      isHidden: !isAuthorizedUserAdmin(user.roles),
    },
  ];
  return mainNav;
};

export const getGeneralConfig = (
  isAuthorized: boolean | undefined,
  user?: User,
): GeneralConfig => {
  let mainNav;

  if (user && isAuthorized) {
    // User is logged in - get personalized nav and remove hidden items
    mainNav = getMainNav(user).filter((item) => !item.isHidden);
  } else {
    // No user - use default public navigation
    mainNav = originalNav;
  }

  return { mainNav };
};
