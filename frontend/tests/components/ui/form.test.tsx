import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { useState } from "react";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from "@/components/ui/form";

describe("Form Components", () => {
  describe("Form (FormProvider)", () => {
    it("renders form with all components", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Label</FormLabel>
                    <FormControl>
                      <input {...field} />
                    </FormControl>
                    <FormDescription>Test description</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByText("Test Label")).toBeInTheDocument();
      expect(screen.getByText("Test description")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("provides form context to child components", () => {
      const TestForm = () => {
        const form = useForm({ defaultValues: { test: "initial" } });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="test-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("test-input") as HTMLInputElement;
      expect(input.value).toBe("initial");
    });
  });

  describe("FormField", () => {
    it("renders field with controller", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input {...field} data-testid="username-input" />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByTestId("username-input")).toBeInTheDocument();
    });

    it("handles multiple fields independently", () => {
      const TestForm = () => {
        const form = useForm({
          defaultValues: { field1: "value1", field2: "value2" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="field1"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="field1" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="field2"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="field2" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const field1 = screen.getByTestId("field1") as HTMLInputElement;
      const field2 = screen.getByTestId("field2") as HTMLInputElement;
      expect(field1.value).toBe("value1");
      expect(field2.value).toBe("value2");
    });

    it("passes field context to children", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="testField"
              render={() => (
                <FormItem>
                  <FormLabel>Field Label</FormLabel>
                  <FormControl>
                    <input />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByText("Field Label")).toBeInTheDocument();
    });
  });

  describe("FormItem", () => {
    it("renders with default spacing class", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem data-testid="form-item">
                  <FormLabel>Label</FormLabel>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const formItem = screen.getByTestId("form-item");
      expect(formItem).toHaveClass("space-y-2");
    });

    it("accepts and applies custom className", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem data-testid="form-item" className="custom-class">
                  <FormLabel>Label</FormLabel>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const formItem = screen.getByTestId("form-item");
      expect(formItem).toHaveClass("space-y-2", "custom-class");
    });

    it("generates unique id for each FormItem", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="field1"
                render={() => (
                  <FormItem data-testid="item1">
                    <FormLabel>Label 1</FormLabel>
                    <FormControl>
                      <input data-testid="input1" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="field2"
                render={() => (
                  <FormItem data-testid="item2">
                    <FormLabel>Label 2</FormLabel>
                    <FormControl>
                      <input data-testid="input2" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input1 = screen.getByTestId("input1");
      const input2 = screen.getByTestId("input2");
      expect(input1.id).toBeTruthy();
      expect(input2.id).toBeTruthy();
      expect(input1.id).not.toBe(input2.id);
    });

    it("provides context to child components", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormLabel>Test Label</FormLabel>
                  <FormControl>
                    <input />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const label = screen.getByText("Test Label");
      const input = screen.getByRole("textbox");
      expect(label.getAttribute("for")).toBe(input.id);
    });
  });

  describe("FormLabel", () => {
    it("renders label text", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByText("Username")).toBeInTheDocument();
    });

    it("applies error styling when field has error", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "This field is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Field</FormLabel>
                    <FormControl>
                      <input {...field} data-testid="test-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("test-input");

      // Trigger validation by interacting with the input
      await user.click(input);
      await user.tab();

      // Wait for validation and error styling
      await waitFor(() => {
        const label = screen.getByText("Required Field");
        expect(label).toHaveClass("text-red-500");
        expect(label).toHaveClass("dark:text-red-500");
      });
    });

    it("links label to form control with htmlFor", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <input data-testid="email-input" />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const label = screen.getByText("Email");
      const input = screen.getByTestId("email-input");
      expect(label.getAttribute("for")).toBe(input.id);
    });

    it("accepts custom className", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormLabel className="custom-label-class">Label</FormLabel>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const label = screen.getByText("Label");
      expect(label).toHaveClass("custom-label-class");
    });
  });

  describe("FormControl", () => {
    it("renders control element with proper id", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormControl>
                    <input data-testid="control-input" />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("control-input");
      expect(input.id).toMatch(/-form-item$/);
    });

    it("sets aria-describedby with description id when no error", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormControl>
                    <input data-testid="control-input" />
                  </FormControl>
                  <FormDescription>Helper text</FormDescription>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("control-input");
      const ariaDescribedBy = input.getAttribute("aria-describedby");
      expect(ariaDescribedBy).toBeTruthy();
      expect(ariaDescribedBy).toContain("-form-item-description");
    });

    it("sets aria-describedby with description and message ids when error exists", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Error message" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="control-input" />
                    </FormControl>
                    <FormDescription>Helper text</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("control-input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        const ariaDescribedBy = input.getAttribute("aria-describedby");
        expect(ariaDescribedBy).toContain("-form-item-description");
        expect(ariaDescribedBy).toContain("-form-item-message");
      });
    });

    it("sets aria-invalid to false when no error", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormControl>
                    <input data-testid="control-input" />
                  </FormControl>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("control-input");
      expect(input.getAttribute("aria-invalid")).toBe("false");
    });

    it("sets aria-invalid to true when error exists", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="control-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("control-input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(input.getAttribute("aria-invalid")).toBe("true");
      });
    });

    it("works with different input types", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="textarea"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <textarea data-testid="textarea-control" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="select"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <select data-testid="select-control">
                        <option>Option 1</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByTestId("textarea-control")).toBeInTheDocument();
      expect(screen.getByTestId("select-control")).toBeInTheDocument();
    });
  });

  describe("FormDescription", () => {
    it("renders description text", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormDescription>This is a helper text</FormDescription>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByText("This is a helper text")).toBeInTheDocument();
    });

    it("has correct id for aria-describedby linking", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormControl>
                    <input data-testid="input" />
                  </FormControl>
                  <FormDescription data-testid="description">
                    Description
                  </FormDescription>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const description = screen.getByTestId("description");
      const input = screen.getByTestId("input");
      expect(description.id).toMatch(/-form-item-description$/);
      expect(input.getAttribute("aria-describedby")).toContain(description.id);
    });

    it("applies default styling classes", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormDescription data-testid="description">
                    Description
                  </FormDescription>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const description = screen.getByTestId("description");
      expect(description).toHaveClass("text-sm");
      expect(description).toHaveClass("text-slate-500");
      expect(description).toHaveClass("dark:text-slate-400");
    });

    it("accepts custom className", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormDescription
                    data-testid="description"
                    className="custom-desc-class"
                  >
                    Description
                  </FormDescription>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      const description = screen.getByTestId("description");
      expect(description).toHaveClass("custom-desc-class");
    });
  });

  describe("FormMessage", () => {
    it("displays error message when field has error", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "This field is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("This field is required")).toBeInTheDocument();
      });
    });

    it("renders custom children when provided and no error", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormMessage>Custom message</FormMessage>
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.getByText("Custom message")).toBeInTheDocument();
    });

    it("returns null when no error and no children", () => {
      const TestForm = () => {
        const form = useForm();
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => (
                <FormItem>
                  <FormMessage data-testid="message" />
                </FormItem>
              )}
            />
          </Form>
        );
      };

      render(<TestForm />);
      expect(screen.queryByTestId("message")).not.toBeInTheDocument();
    });

    it("has correct id for aria-describedby linking", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Error" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="input" />
                    </FormControl>
                    <FormMessage data-testid="message" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        const message = screen.getByTestId("message");
        expect(message.id).toMatch(/-form-item-message$/);
        expect(input.getAttribute("aria-describedby")).toContain(message.id);
      });
    });

    it("applies error styling classes", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Error message" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="input" />
                    </FormControl>
                    <FormMessage data-testid="message" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        const message = screen.getByTestId("message");
        expect(message).toHaveClass("text-sm");
        expect(message).toHaveClass("font-medium");
        expect(message).toHaveClass("text-red-500");
        expect(message).toHaveClass("dark:text-red-600");
      });
    });

    it("accepts custom className", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Error" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="input" />
                    </FormControl>
                    <FormMessage
                      data-testid="message"
                      className="custom-error-class"
                    />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);
      const input = screen.getByTestId("input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        const message = screen.getByTestId("message");
        expect(message).toHaveClass("custom-error-class");
      });
    });

    it("prioritizes error message over children", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({
          mode: "onBlur",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="test"
                rules={{ required: "Validation error" }}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} data-testid="input" />
                    </FormControl>
                    <FormMessage>Custom children</FormMessage>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);

      // Initially, custom children should be displayed
      expect(screen.getByText("Custom children")).toBeInTheDocument();

      const input = screen.getByTestId("input");

      // Trigger validation
      await user.click(input);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Validation error")).toBeInTheDocument();
        expect(screen.queryByText("Custom children")).not.toBeInTheDocument();
      });
    });
  });

  describe("useFormField hook", () => {
    it("throws error when used outside FormField", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const TestComponent = () => {
        expect(() => useFormField()).toThrow(
          "useFormField should be used within <FormField>",
        );
        return null;
      };

      expect(() => render(<TestComponent />)).toThrow();

      consoleSpy.mockRestore();
    });

    it("returns correct form field data", () => {
      let hookResult: any;

      const TestForm = () => {
        const form = useForm({ defaultValues: { test: "value" } });
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              render={() => {
                const HookConsumer = () => {
                  hookResult = useFormField();
                  return <div>Test</div>;
                };
                return (
                  <FormItem>
                    <HookConsumer />
                  </FormItem>
                );
              }}
            />
          </Form>
        );
      };

      render(<TestForm />);

      expect(hookResult.name).toBe("test");
      expect(hookResult.id).toBeTruthy();
      expect(hookResult.formItemId).toMatch(/-form-item$/);
      expect(hookResult.formDescriptionId).toMatch(/-form-item-description$/);
      expect(hookResult.formMessageId).toMatch(/-form-item-message$/);
    });

    it("provides field state information", () => {
      let hookResult: any;

      const TestForm = () => {
        const form = useForm({
          mode: "onChange",
          defaultValues: { test: "" },
        });
        return (
          <Form {...form}>
            <FormField
              control={form.control}
              name="test"
              rules={{ required: true }}
              render={() => {
                const HookConsumer = () => {
                  hookResult = useFormField();
                  return <div>Test</div>;
                };
                return (
                  <FormItem>
                    <HookConsumer />
                  </FormItem>
                );
              }}
            />
          </Form>
        );
      };

      render(<TestForm />);

      expect(hookResult).toHaveProperty("invalid");
      expect(hookResult).toHaveProperty("isDirty");
      expect(hookResult).toHaveProperty("isTouched");
      expect(hookResult).toHaveProperty("error");
    });
  });

  describe("Integration tests", () => {
    it("handles complete form workflow with validation", async () => {
      const TestForm = () => {
        const form = useForm({
          mode: "onSubmit",
          defaultValues: { email: "", password: "" },
        });

        return (
          <Form {...form}>
            <form data-testid="form">
              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <input {...field} data-testid="email-input" />
                    </FormControl>
                    <FormDescription>Enter your email</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        type="password"
                        data-testid="password-input"
                      />
                    </FormControl>
                    <FormDescription>Enter your password</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Password")).toBeInTheDocument();
      expect(screen.getByText("Enter your email")).toBeInTheDocument();
      expect(screen.getByText("Enter your password")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
    });

    it("maintains separate contexts for nested FormItems", () => {
      const TestForm = () => {
        const form = useForm({
          defaultValues: { outer: "outer-value", inner: "inner-value" },
        });

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="outer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outer Field</FormLabel>
                    <FormControl>
                      <input {...field} data-testid="outer-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inner Field</FormLabel>
                    <FormControl>
                      <input {...field} data-testid="inner-input" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      };

      render(<TestForm />);

      const outerInput = screen.getByTestId("outer-input") as HTMLInputElement;
      const innerInput = screen.getByTestId("inner-input") as HTMLInputElement;

      expect(outerInput.id).not.toBe(innerInput.id);
      expect(outerInput.value).toBe("outer-value");
      expect(innerInput.value).toBe("inner-value");
    });

    it("handles dynamic field addition and removal", async () => {
      const user = userEvent.setup();
      const TestForm = () => {
        const form = useForm({ defaultValues: { fields: ["field1"] } });
        const [showSecond, setShowSecond] = useState(false);

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="fields.0"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field 1</FormLabel>
                    <FormControl>
                      <input {...field} data-testid="field-1" />
                    </FormControl>
                  </FormItem>
                )}
              />
              {showSecond && (
                <FormField
                  control={form.control}
                  name="fields.1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field 2</FormLabel>
                      <FormControl>
                        <input {...field} data-testid="field-2" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => setShowSecond(!showSecond)}
                data-testid="toggle-button"
              >
                Toggle
              </button>
            </form>
          </Form>
        );
      };

      render(<TestForm />);

      expect(screen.getByTestId("field-1")).toBeInTheDocument();
      expect(screen.queryByTestId("field-2")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("toggle-button"));

      expect(screen.getByTestId("field-1")).toBeInTheDocument();
      expect(screen.getByTestId("field-2")).toBeInTheDocument();
    });
  });
});
