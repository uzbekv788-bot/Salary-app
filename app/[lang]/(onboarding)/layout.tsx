export default function OnboardingLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {children}
    </main>
  );
}
