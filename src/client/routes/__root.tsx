import { createRootRoute, Outlet } from "@tanstack/react-router"

import { Sidebar } from "@/components/ui/Sidebar"

export const Route = createRootRoute({
  component: () => (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 py-6">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  ),
})
