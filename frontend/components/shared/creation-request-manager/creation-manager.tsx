
import { AddUser } from "../access-manager/add-user/add-user";
import { BatchAddUser } from "../access-manager/add-user/batch-add-user";
import { isAuthorizedUserAdmin } from "@/lib/utils";
import { User } from "@/types";
import { CreationRequests } from "./creation-requests";

export async function CreationRequestManager({ user }: { user: User }) {
  const isAdmin = isAuthorizedUserAdmin(user.roles);

  return (
    <>
      {/* <AddUser />
      <BatchAddUser /> */}
      {isAdmin ? <CreationRequests /> : <></>}
    </>
  );
}
