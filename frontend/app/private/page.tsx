import AuthorizedUsers from "@/ui/admin/users/authorized-users";
import Session from "@/ui/admin/session";

export default function Page() {
  return (
    <div className="w-full max-w-5xl p-8 mx-auto space-y-12">
      <Session />
      <AuthorizedUsers />
    </div>
  );
}
