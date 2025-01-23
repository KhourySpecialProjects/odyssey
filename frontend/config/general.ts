import {
  isAuthorizedUserAdmin,
  isAuthorizedUserFaculty,
  isContentCreator,
} from "@/lib/utils";
import { GeneralConfig, User } from "@/types";

export const originalNav = [
  {
    href: "/about",
    label: "About",
  },
  {
    href: "/explore",
    label: "Explore",
  },
];

export const getMainNav = (user: User) => {
  const mainNav = [
    {
      href: "/about",
      label: "About",
    },
    {
      href: "/explore",
      label: "Explore",
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
      href: "/about",
      label: "About",
    },
    {
      href: "/explore",
      label: "Explore",
    },
    {
      href: "/dashboard",
      label: "My Content",
    },
    {
      href: "/drafts",
      label: "Drafts",
    },
  ];

  if (isAuthorizedUserAdmin(user.roles)) {
    baseNav.push({
      href: "/admin",
      label: "Admin",
    });
  }

  // if (isAuthorizedUserFaculty(user.roles)) {
  //   baseNav.push({
  //     href: "/faculty",
  //     label: "Faculty"
  //   })
  // }

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
