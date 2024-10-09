import {AccessRequests} from './access-requests/access-requests'
import { AddUser } from './add-user/add-user'
import { BatchAddUser } from './add-user/batch-add-user'

export async function AccessManager() {
  return (
    <>
      <AddUser />
      <BatchAddUser />
      <AccessRequests />
    </>
  );
}