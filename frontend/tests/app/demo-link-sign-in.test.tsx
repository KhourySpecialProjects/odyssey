import { render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";
import { DemoLinkSignIn } from "@/app/(general)/auth/demo-link/demo-link-sign-in";

jest.mock("next-auth/react", () => ({ signIn: jest.fn() }));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const originalLocation = window.location;

describe("DemoLinkSignIn", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    (window as any).location = originalLocation;
  });

  it("lands where the link says, leaving the used link out of history", async () => {
    const replace = jest.fn();
    delete (window as any).location;
    (window as any).location = { replace };
    mockSignIn.mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: null,
    } as never);

    render(<DemoLinkSignIn token="abc.def" callbackUrl="/review" />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/review"));
  });

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
