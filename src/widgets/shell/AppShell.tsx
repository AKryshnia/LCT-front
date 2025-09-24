import Sidebar from './Sidebar'

export default function AppShell({ children }:{ children: React.ReactNode }){
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  )
}
