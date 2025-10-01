// src/pages/auth/LoginPage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login, type Role } from '@features/auth/model/auth.slice';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const roleRu: Record<Role, string> = {
  operator: 'Оператор',
  analyst: 'Аналитик',
  admin: 'Администратор',
};

const LoginPage: React.FC = () => {
  const [loginValue, setLoginValue] = useState('Vatrushka');
  const [password, setPassword] = useState(''); // мок, никуда не идёт
  const [selectedRole, setSelectedRole] = useState<Role>('admin');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const canSubmit = useMemo(() => loginValue.trim().length > 0, [loginValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    dispatch(login({ name: loginValue || 'Пользователь', roles: [selectedRole] }));
    navigate('/');
  };

  const logoUrl = `${import.meta.env.BASE_URL}Subtract.svg`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* фон: мягкие цветные «пятна» */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-[#0B4A6F]/45 blur-[120px] saturate-150" />
        <div className="absolute right-[-10rem] top-[-8rem] h-[36rem] w-[36rem] rounded-full bg-[#1379A6]/50 blur-[120px] saturate-150" />
        <div className="absolute -bottom-28 left-16 h-[32rem] w-[32rem] rounded-full bg-[#23A4CF]/60 blur-[120px] saturate-150" />
      </div>
      {/* белая «линза» по центру */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at center,' +
            'rgba(255,255,255,1) 0%,' +
            'rgba(255,255,255,0.98) 28%,' +
            'rgba(255,255,255,0.92) 44%,' +
            'rgba(255,255,255,0.70) 62%,' +
            'rgba(255,255,255,0.35) 80%,' +
            'rgba(255,255,255,0.12) 100%)',
        }}
      />

      {/* центрированный блок */}
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <div className="relative w-full rounded-[20px] bg-transparent p-6 text-center">
          {/* временная кнопка роли */}
          <div className="absolute right-3 top-3 mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white border border-slate-200"
                  title="Выбрать роль (временно)"
                >
                  Роль: {roleRu[selectedRole]}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setSelectedRole('operator')}>Оператор</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole('analyst')}>Аналитик</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedRole('admin')}>Администратор</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* логотип + заголовок как в макете */}
          <img
            src={logoUrl}
            alt="Аэростат"
            className="mx-auto mt-6 mb-3 mt-2 h-12 w-14"
          />
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900">Аэростат</h1>

          {/* форма */}
          <form onSubmit={handleSubmit} className="mt-8 text-left">
            <label className="mb-1 block text-sm font-medium text-slate-700">Логин</label>
            <Input
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              placeholder="Vatrushka"
              className="mb-4 h-11 rounded-[12px] border-slate-200 text-[15px] placeholder:text-slate-400"
            />

            <label className="mb-1 block text-sm font-medium text-slate-700">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-[12px] border-slate-200 text-[15px] placeholder:text-slate-400"
            />

            <div className="mt-2">
              <button type="button" className="text-sm text-blue-600 hover:underline">
                Восстановить
              </button>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-11 w-40 rounded-[12px] text-[15px]"
              >
                Войти
              </Button>
            </div>

            <div className="mt-4 text-center">
              <button type="button" className="text-sm text-blue-600 hover:underline">
                Не удаётся войти
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
