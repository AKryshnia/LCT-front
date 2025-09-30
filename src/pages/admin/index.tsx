import React from 'react'
import { RoleGuard } from '@features/auth/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const AdminPage: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([])
  React.useEffect(()=>{ fetch('/api/admin/users').then(r=>r.json()).then(setUsers) }, [])
  return (
    <RoleGuard allow={['admin']}>
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Администрирование</h1>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left"><thead><tr><th>Имя</th><th>Роли</th></tr></thead><tbody>
              {users.map(u=> <tr key={u.id}><td>{u.name}</td><td>{u.roles.join(', ')}</td></tr>)}
            </tbody></table>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
