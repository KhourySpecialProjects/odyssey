import { render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { DemoLinkSignIn } from "@/app/(general)/auth/demo-link/demo-link-sign-in";

jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe("DemoLinkSignIn", () => {
  beforeEach(() => jest.clearAllMocks());

  it("logs in once with the link's token", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));
    render(<DemoLinkSignIn token="abc.def" callbackUrl="/explore" />);

    expect(screen.getByRole("status")).toHaveTextContent(/logging you in/i);
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(mockSignIn).toHaveBeenCalledWith("demo-link", {
      token: "abc.def",
      redirect: false,
    });
  });

  it("explains a link that no longer works", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      status: 401,
      url: null,
    });
    render(<DemoLinkSignIn token="used.token" callbackUrl="/explore" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't work/i);
    expect(
      screen.getByRole("link", { name: /pick a persona/i }),
    ).toHaveAttribute("href", "/auth/login");
  });
});
