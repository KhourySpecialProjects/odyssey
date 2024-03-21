export function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-5xl p-8 mx-auto">
      <div className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 text-center">
        {children}
      </div>
    </div>
  );
}

export function MessageHeader({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <>
      <p className="text-base uppercase font-semibold text-indigo-600">
        {subtitle}
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        {title}
      </h1>
    </>
  );
}

export function MessageDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p className="mt-6 text-base leading-7 text-gray-600">{children}</p>;
}

export function MessageActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10 flex items-center justify-center gap-x-6">
      {children}
    </div>
  );
}
