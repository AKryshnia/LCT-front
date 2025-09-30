import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login, type Role } from '@features/auth/model/auth.slice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const LoginPage: React.FC = () => {
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('operator');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = () => {
    const roles: Role[] = [selectedRole];

    dispatch(login({ name: name || 'Пользователь', roles }));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Вход в систему аналитики БАС
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Имя (необязательно)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Роль</label>
            <select
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
            >
              <option value="operator">Оператор</option>
              <option value="analyst">Аналитик</option>
              <option value="admin">Администратор</option>
            </select>
          </div>

          <Button onClick={handleLogin} className="w-full">
            Войти
          </Button>

          <div className="text-xs text-center text-slate-500">
            Это мок-авторизация для демонстрации
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
