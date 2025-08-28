'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { emailPattern, namePattern } from '@/lib/patterns';
import { login, register } from '@/lib/auth';
import { Loader2, Eye, EyeOff } from 'lucide-react';

type Tab = 'login' | 'registro';

export function AuthView() {
  const search = useSearchParams();
  const router = useRouter();
  const initial: Tab = (search.get('tab') === 'registro') ? 'registro' : 'login';
  const [tab, setTab] = useState<Tab>(initial);

  // URL ↔ pestaña (sin navegación)
  useEffect(() => {
    const q = new URLSearchParams(Array.from(search.entries()));
    if (tab === 'registro') q.set('tab', 'registro'); else q.delete('tab');
    window.history.replaceState(null, '', `/auth${q.toString() ? `?${q}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="rounded-xl2 border border-default p-4 bg-[var(--bg)]">
      <Tabs tab={tab} onChange={setTab} />

      {/* Contenedor relativo para transición entre vistas */}
      <div className="relative min-h-[340px]">
        {/* LOGIN */}
        <section
          aria-hidden={tab !== 'login'}
          className={[
            'absolute inset-0',
            'transition-[opacity,transform] duration-200',
            tab === 'login' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-0.5',
            'motion-reduce:transition-none'
          ].join(' ')}
        >
          <LoginForm onSuccess={() => router.push('/mi-aprendizaje')} autoFocus={tab==='login'} />
        </section>

        {/* REGISTRO */}
        <section
          aria-hidden={tab !== 'registro'}
          className={[
            'absolute inset-0',
            'transition-[opacity,transform] duration-200',
            tab === 'registro' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-0.5',
            'motion-reduce:transition-none'
          ].join(' ')}
        >
          <RegisterForm onSuccess={() => setTab('login')} autoFocus={tab==='registro'} />
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────── Tabs con slider ───────────────────────── */
function Tabs({ tab, onChange }:{ tab:Tab; onChange:(t:Tab)=>void }) {
  return (
    <div className="relative grid grid-cols-2 mb-4 rounded-xl2 p-1 bg-[var(--bg-muted,#f6f6f6)]">
      {/* Indicador deslizante */}
      <span
        aria-hidden
        className={[
          'absolute top-1 bottom-1 left-1 w-1/2 rounded-lg border border-default bg-[var(--bg)] shadow',
          'transition-transform duration-200 ease-out will-change-transform',
          tab === 'login' ? 'translate-x-0' : 'translate-x-full',
          'motion-reduce:transition-none'
        ].join(' ')}
      />
      <button
        className={[
          'relative z-10 py-2 rounded-lg text-sm transition-colors',
          tab==='login' ? 'text-foreground' : 'hover:text-[var(--pink)]'
        ].join(' ')}
        onClick={() => onChange('login')}
        type="button"
        aria-selected={tab==='login'}
        aria-controls="auth-login"
      >
        Ingresar
      </button>
      <button
        className={[
          'relative z-10 py-2 rounded-lg text-sm transition-colors',
          tab==='registro' ? 'text-foreground' : 'hover:text-[var(--pink)]'
        ].join(' ')}
        onClick={() => onChange('registro')}
        type="button"
        aria-selected={tab==='registro'}
        aria-controls="auth-register"
      >
        Crear cuenta
      </button>
    </div>
  );
}

/* ─────────────────────── Form: Login ─────────────────────── */
function LoginForm({ onSuccess, autoFocus }:{ onSuccess: ()=>void; autoFocus?: boolean }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      id="auth-login"
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!emailPattern.test(email)) return setErr('Ingresá un email válido.');
        if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
        setLoading(true);
        try { await login(email, password); onSuccess(); }
        catch { setErr('Credenciales inválidas o cuenta inexistente.'); }
        finally { setLoading(false); }
      }}
    >
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        pattern={emailPattern.source}
        autoComplete="email"
        autoFocus={autoFocus}
      />
      <div className="relative">
        <Input
          label="Contraseña"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-[34px] inline-flex items-center justify-center rounded-md p-1.5 hover:bg-neutral-100"
        >
          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {err && <p className="text-sm text-red-600/90 flex items-center gap-2" role="alert"><span className="inline-block size-4 rounded-full bg-red-600/15" />{err}</p>}
      <Button type="submit" tone="gold" disabled={loading} className="w-full">
        {loading ? (<span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Ingresando…</span>) : 'Ingresar'}
      </Button>
      <p className="text-xs text-muted">
        ¿Olvidaste tu contraseña? <a href="/ayuda" className="underline hover:text-[var(--pink)]">Recuperar acceso</a>
      </p>
    </form>
  );
}

/* ─────────────────────── Form: Registro ─────────────────────── */
function RegisterForm({ onSuccess, autoFocus }:{ onSuccess: ()=>void; autoFocus?: boolean }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      id="auth-register"
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!namePattern.test(nombre)) return setErr('El nombre debe tener entre 2 y 60 caracteres (sólo letras y espacios).');
        if (!emailPattern.test(email))  return setErr('Ingresá un email válido.');
        if (password.length < 6)        return setErr('La contraseña debe tener al menos 6 caracteres.');
        setLoading(true);
        try { await register({ nombre, email, password }); onSuccess(); }
        catch { setErr('No pudimos crear tu cuenta. ¿El email ya existe?'); }
        finally { setLoading(false); }
      }}
    >
      <Input
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        pattern={namePattern.source}
        title="Sólo letras y espacios, 2 a 60 caracteres."
        autoComplete="name"
        autoFocus={autoFocus}
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        pattern={emailPattern.source}
        autoComplete="email"
      />
      <div className="relative">
        <Input
          label="Contraseña"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={64}
          autoComplete="new-password"
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-2 top-[34px] inline-flex items-center justify-center rounded-md p-1.5 hover:bg-neutral-100"
        >
          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {err && <p className="text-sm text-red-600/90 flex items-center gap-2" role="alert"><span className="inline-block size-4 rounded-full bg-red-600/15" />{err}</p>}
      <Button type="submit" tone="gold" disabled={loading} className="w-full">
        {loading ? (<span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Creando…</span>) : 'Crear cuenta'}
      </Button>
      <p className="text-xs text-muted">
        Al registrarte aceptás los <a href="/terminos" className="underline hover:text-[var(--pink)]">Términos</a> y la <a href="/privacidad" className="underline hover:text-[var(--pink)]">Política de privacidad</a>.
      </p>
    </form>
  );
}
