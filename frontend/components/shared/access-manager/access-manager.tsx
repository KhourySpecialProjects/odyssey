import {AccessRequests} from './access-requests/access-requests'
import { AddUser } from './add-user/add-user'
import { BatchAddUser } from './add-user/batch-add-user'
import {isAuthorizedUserAdmin} from "@/lib/utils";
import {User} from "@/types";

export async function AccessManager({ user }: { user: User }) {
    const isAdmin = isAuthorizedUserAdmin(user.roles);

    return (
    <>
      <AddUser />
      <BatchAddUser />
      {isAdmin ?
          <AccessRequests />
          : <></>
      }
    </>
  );
}