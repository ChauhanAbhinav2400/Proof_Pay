export function ErrorState({ message }: { message: string }): JSX.Element { return <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{message}</div>; }
