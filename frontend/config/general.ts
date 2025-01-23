import { isAuthorizedUserAdmin, isAuthorizedUserFaculty } from "@/lib/utils";
import { GeneralConfig, User } from "@/types";

export const mainNav = [
  {
    href: "/about",
    label: "About",
  },
  {
    href: "/explore",
    label: "Explore",
  },
  {
    href: "/g/dashboard",
    label: "My Groups",
  },
];

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
      href: "/g/dashboard",
      label: "My Groups",
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

const nonAuthedNav = [
  {
    href: "/about",
    label: "About",
  },
  {
    href: "/explore",
    label: "Explore",
  },
]

export const getGeneralConfig = (user?: User): GeneralConfig => ({
  mainNav,
  contentCreatorNav: user ? getContentCreatorNav(user) : mainNav,
  nonAuthedNav
});
