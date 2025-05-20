import { isAuthorizedUserAdmin, isContentCreator, isContentEditor } from "@/lib/utils";
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
      href: "/g/dashboard?tab=creator",
      label: "Groups",
      isHidden:
        !isContentCreator(user.roles) && !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/drafts",
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

export const getGeneralConfig = (user?: User): GeneralConfig => ({
  mainNav: user
    ? getMainNav(user).filter((item) => !item.isHidden)
    : originalNav,
});
