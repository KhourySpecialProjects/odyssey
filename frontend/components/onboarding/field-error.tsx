/** An announced validation message; pair its id with aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

/** aria props that tie a control to its error message. */
export const errorProps = (id: string, message?: string) =>
  message ? { "aria-invalid": true, "aria-describedby": id } : {};
