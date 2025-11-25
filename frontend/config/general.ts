import {
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
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
      label: "Create",
      isHidden:
        !isContentCreator(user.roles) &&
        !isAuthorizedUserAdmin(user.roles) &&
        !isAuthorizedUserFaculty(user.roles),
    },
    {
      href: "/review",
      label: "Review",
      isHidden:
        !isContentEditor(user.roles) && !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/admin",
      label: "Admin",
      isHidden: !isAuthorizedUserAdmin(user.roles),
    },
    {
      href: "/creation-request",
      label: "Create",
      isHidden: !(
        user?.roles?.some((role) => role === "User") &&
        !user?.roles?.some((role) =>
          ["Content Creator", "Faculty", "System Admin"].includes(role),
        )
      ),
    },
  ];
  return mainNav;
};

export const getGeneralConfig = (user?: User): GeneralConfig => ({
  mainNav: user
    ? getMainNav(user).filter((item) => !item.isHidden)
    : originalNav,
});
