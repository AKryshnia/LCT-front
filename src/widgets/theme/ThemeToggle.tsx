import { Button } from '@/components/ui/button'

export default function ThemeToggle(){
  const toggle = () => document.documentElement.classList.toggle('dark')
  return <Button variant="ghost" size="sm" onClick={toggle}>🌓</Button>
}
