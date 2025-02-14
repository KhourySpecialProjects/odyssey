import {
  isAuthorizedUserAdmin,
  isContentCreator,
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
      label: "My Dashboard",
    },
    {
      href: "/g/dashboard",
      label: "My Groups",
    },
  ];
  if (isAuthorizedUserAdmin(user.roles)) {
    mainNav.push({
      href: "/admin",
      label: "Admin",
    });
  }
  return mainNav;
};
export const getContentCreatorNav = (user: User) => {
  const baseNav = [
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
      label: "My Dashboard",
    },
    {
      href: "/g/dashboard",
      label: "My Groups",
    },
    {
      href: "/drafts",
      label: "My Content",
    },
  ];
  if (isAuthorizedUserAdmin(user.roles)) {
    baseNav.push({
      href: "/admin",
      label: "Admin",
    });
  }
  return baseNav;
};
export const getGeneralConfig = (user?: User): GeneralConfig => ({
  contentCreatorNav: user
    ? isContentCreator(user.roles)
      ? getContentCreatorNav(user)
      : getMainNav(user)
    : originalNav,
  mainNav: user ? getMainNav(user) : originalNav,
});
