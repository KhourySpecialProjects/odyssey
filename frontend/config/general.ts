import { isAuthorizedUserAdmin, isContentCreator } from "@/lib/utils";
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
    {
      href: "/drafts",
      label: "My Content",
      isHidden: !isContentCreator(user.roles),
    },
    {
      href: "/admin",
      label: "Admin",
      isHidden: !isAuthorizedUserAdmin(user.roles),
    },
  ];
  return mainNav;
};

export const getGeneralConfig = (user?: User): GeneralConfig => ({
  mainNav: user ? getMainNav(user) : originalNav,
});
