import { Home, LineChart, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const Item = ({ to, icon:Icon }: { to:string; icon:any }) => (
  <NavLink to={to} className={({isActive}) =>
    `flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 ${
      isActive ? 'bg-slate-200' : ''
    }`
  }>
    <Icon size={18} />
  </NavLink>
)

export default function Sidebar(){
  return (
    <aside className="w-16 shrink-0 border-r bg-white flex flex-col items-center py-4 gap-4">
      <img src="/avatar.png" alt="avatar" className="w-10 h-10 rounded-full object-cover" />
      <div className="flex flex-col gap-2 mt-12">
        <Item to="/" icon={Home} />
        <Item to="/region/77" icon={LineChart} />
        <Item to="/admin" icon={Settings} />
      </div>
    </aside>
  )
}
