import Sidebar, { MobileNav } from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-3 sm:p-4 md:p-8 pb-24 md:pb-8 w-full max-w-[1400px] overflow-x-hidden">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
