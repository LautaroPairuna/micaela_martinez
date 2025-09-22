'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { emailPattern, namePattern } from '@/lib/patterns';
import { login, register } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/store/favorites';
import { listAddresses } from '@/lib/sdk/userApi';
import { useCheckout } from '@/store/checkout';
import { Loader2, Eye, EyeOff, User, Mail, Lock, GraduationCap, UserPlus } from 'lucide-react';

type Tab = 'login' | 'registro';

export function AuthView() {
  const search = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { loadFavorites } = useFavorites();
  const { setShippingAddress } = useCheckout();
  const initial: Tab = search.get('tab') === 'registro' ? 'registro' : 'login';
  const [tab, setTab] = useState<Tab>(initial);

  // Si el guard nos mandó ?next=... o ?redirect=..., respetarlo
  const nextUrl = search.get('next') || search.get('redirect') || '/mi-aprendizaje';

  const handleLoginSuccess = async () => {
    try {
      // Actualizar el estado de sesión después del login usando el contexto centralizado
      await refreshUser();
      
      // Cargar explícitamente los datos del usuario (favoritos y direcciones)
      // Esto asegura que estén disponibles antes de la redirección
      await Promise.all([
        loadFavorites(true),
        (async () => {
          try {
            const addresses = await listAddresses();
            const defaultAddress = addresses.find(addr => addr.predeterminada);
            if (defaultAddress) {
              setShippingAddress(defaultAddress);
            }
          } catch (error) {
            console.debug('No se pudieron cargar direcciones:', error);
          }
        })()
      ]);
      
      router.push(nextUrl);
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      router.push(nextUrl);
    }
  };

  // URL ↔ pestaña (sin navegación)
  useEffect(() => {
    const q = new URLSearchParams(Array.from(search.entries()));
    if (tab === 'registro') q.set('tab', 'registro');
    else q.delete('tab');
    // preserva otros params (p.ej. ?next=...)
    window.history.replaceState(null, '', `/auth${q.toString() ? `?${q}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="max-w-md mx-auto">
      {/* Header con icono y título */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gold)]/10 to-[var(--gold)]/20 border border-[var(--gold)]/30 mb-4">
          <GraduationCap className="w-8 h-8 text-[var(--gold)]" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {tab === 'login' ? 'Bienvenido de vuelta' : 'Crear nueva cuenta'}
        </h1>
        <p className="text-sm text-muted">
          {tab === 'login' 
            ? 'Ingresá a tu cuenta para continuar aprendiendo' 
            : 'Comenzá tu viaje de aprendizaje hoy mismo'
          }
        </p>
      </div>

      {/* Contenedor principal con mejor diseño */}
      <div className="rounded-2xl border border-default bg-[var(--bg)] shadow-lg overflow-hidden">
        <Tabs tab={tab} onChange={setTab} />

        {/* Contenedor relativo para transición entre vistas */}
        <div className="relative min-h-[400px] p-6">
          {/* LOGIN */}
          <section
            aria-hidden={tab !== 'login'}
            className={[
              'absolute inset-6',
              'transition-[opacity,transform] duration-300 ease-out',
              tab === 'login' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
              'motion-reduce:transition-none',
            ].join(' ')}
          >
            <LoginForm onSuccess={handleLoginSuccess} autoFocus={tab === 'login'} />
          </section>

          {/* REGISTRO */}
          <section
            aria-hidden={tab !== 'registro'}
            className={[
              'absolute inset-6',
              'transition-[opacity,transform] duration-300 ease-out',
              tab === 'registro' ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
              'motion-reduce:transition-none',
            ].join(' ')}
          >
            <RegisterForm onSuccess={() => setTab('login')} autoFocus={tab === 'registro'} />
          </section>
        </div>
      </div>

      {/* Footer informativo */}
      <div className="text-center mt-6 text-xs text-muted">
        <p>¿Necesitás ayuda? <a href="/ayuda" className="text-[var(--gold)] hover:underline">Contactanos</a></p>
      </div>
    </div>
  );
}

/* ───────────────────────── Tabs con slider mejorado ───────────────────────── */
function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="relative grid grid-cols-2 bg-gradient-to-r from-[var(--bg-muted,#f6f6f6)] to-[var(--bg-muted,#f6f6f6)] border-b border-default/50">
        {/* Indicador deslizante mejorado */}
        <span
          aria-hidden
          className={[
            'absolute bottom-0 left-0 h-0.5 w-1/2 bg-[var(--gold)]',
            'transition-transform duration-300 ease-out will-change-transform',
            tab === 'login' ? 'translate-x-0' : 'translate-x-full',
            'motion-reduce:transition-none',
          ].join(' ')}
        />
      <button
        className={[
          'relative z-10 py-4 px-6 text-sm font-medium transition-all duration-200',
          'flex items-center justify-center gap-2',
          tab === 'login' 
            ? 'text-[var(--gold)] bg-[var(--gold)]/5' 
            : 'text-muted hover:text-[var(--gold)] hover:bg-[var(--gold)]/5',
        ].join(' ')}
        onClick={() => onChange('login')}
        type="button"
        aria-controls="auth-login"
      >
        <User className="w-4 h-4" />
        Ingresar
      </button>
      <button
        className={[
          'relative z-10 py-4 px-6 text-sm font-medium transition-all duration-200',
          'flex items-center justify-center gap-2',
          tab === 'registro' 
            ? 'text-[var(--gold)] bg-[var(--gold)]/5' 
            : 'text-muted hover:text-[var(--gold)] hover:bg-[var(--gold)]/5',
        ].join(' ')}
        onClick={() => onChange('registro')}
        type="button"
        aria-controls="auth-registro"
      >
        <UserPlus className="w-4 h-4" />
        Crear cuenta
      </button>
    </div>
  );
}

/* ─────────────────────── Form: Login mejorado ─────────────────────── */
function LoginForm({ onSuccess, autoFocus }: { onSuccess: () => void; autoFocus?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      id="auth-login"
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!emailPattern.test(email)) return setErr('Ingresá un email válido.');
        if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
        setLoading(true);
        try {
          await login(email, password);
          onSuccess();
        } catch {
          setErr('Credenciales inválidas o cuenta inexistente.');
        } finally {
          setLoading(false);
        }
      }}
    >
      {/* Campo Email con icono */}
      <div className="relative">
        <div className="absolute left-3 top-[34px] flex items-center pointer-events-none">
          <Mail className="w-4 h-4 text-muted" />
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          pattern={emailPattern.source}
          autoComplete="email"
          autoFocus={autoFocus}
          className="pl-10"
        />
      </div>

      {/* Campo Contraseña con iconos */}
      <div className="relative">
        <div className="absolute left-3 top-[34px] flex items-center pointer-events-none">
          <Lock className="w-4 h-4 text-muted" />
        </div>
        <Input
          label="Contraseña"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-[34px] inline-flex items-center justify-center rounded-md p-1 hover:bg-neutral-100 transition-colors"
        >
          {showPw ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
        </button>
      </div>

      {/* Error mejorado */}
      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700 flex items-center gap-2" role="alert">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {err}
          </p>
        </div>
      )}

      {/* Botón mejorado */}
      <Button 
        type="submit" 
        tone="gold" 
        disabled={loading} 
        className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Ingresando…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <User className="w-5 h-5" /> Ingresar
          </span>
        )}
      </Button>

      {/* Enlaces de ayuda */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted">
          ¿Olvidaste tu contraseña?{' '}
          <a href="/ayuda" className="text-[var(--gold)] hover:underline font-medium transition-colors">
            Recuperar acceso
          </a>
        </p>
      </div>
    </form>
  );
}

/* ─────────────────────── Form: Registro mejorado ─────────────────────── */
function RegisterForm({ onSuccess, autoFocus }: { onSuccess: () => void; autoFocus?: boolean }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      id="auth-register"
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!namePattern.test(nombre))
          return setErr('El nombre debe tener entre 2 y 60 caracteres (sólo letras y espacios).');
        if (!emailPattern.test(email)) return setErr('Ingresá un email válido.');
        if (password.length < 6) return setErr('La contraseña debe tener al menos 6 caracteres.');
        setLoading(true);
        try {
          await register({ nombre, email, password });
          onSuccess(); // volvemos a la pestaña login
        } catch {
          setErr('No pudimos crear tu cuenta. ¿El email ya existe?');
        } finally {
          setLoading(false);
        }
      }}
    >
      {/* Campo Nombre con icono */}
      <div className="relative">
        <div className="absolute left-3 top-[34px] flex items-center pointer-events-none">
          <User className="w-4 h-4 text-muted" />
        </div>
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          pattern={namePattern.source}
          title="Sólo letras y espacios, 2 a 60 caracteres."
          autoComplete="name"
          autoFocus={autoFocus}
          className="pl-10"
        />
      </div>

      {/* Campo Email con icono */}
      <div className="relative">
        <div className="absolute left-3 top-[34px] flex items-center pointer-events-none">
          <Mail className="w-4 h-4 text-muted" />
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          pattern={emailPattern.source}
          autoComplete="email"
          className="pl-10"
        />
      </div>

      {/* Campo Contraseña con iconos */}
      <div className="relative">
        <div className="absolute left-3 top-[34px] flex items-center pointer-events-none">
          <Lock className="w-4 h-4 text-muted" />
        </div>
        <Input
          label="Contraseña"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={64}
          autoComplete="new-password"
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-[34px] inline-flex items-center justify-center rounded-md p-1 hover:bg-neutral-100 transition-colors"
        >
          {showPw ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
        </button>
      </div>

      {/* Error mejorado */}
      {err && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700 flex items-center gap-2" role="alert">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {err}
          </p>
        </div>
      )}

      {/* Botón mejorado */}
      <Button 
        type="submit" 
        tone="gold" 
        disabled={loading} 
        className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Creando…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
             <UserPlus className="w-5 h-5" /> Crear cuenta
           </span>
        )}
      </Button>

      {/* Términos y condiciones */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted leading-relaxed">
          Al registrarte aceptás los{' '}
          <a href="/terminos" className="text-[var(--gold)] hover:underline font-medium transition-colors">
             Términos
           </a>{' '}
           y la{' '}
           <a href="/privacidad" className="text-[var(--gold)] hover:underline font-medium transition-colors">
            Política de privacidad
          </a>
          .
        </p>
      </div>
    </form>
  );
}
