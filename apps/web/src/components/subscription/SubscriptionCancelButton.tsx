'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cancelSubscription } from '@/lib/sdk/ordersApi';
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { 
  MoreHorizontal, 
  XCircle, 
  HelpCircle, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionCancelButtonProps {
  orderId: string;
  onCancelled?: () => void;
}

export function SubscriptionCancelButton({ orderId, onCancelled }: SubscriptionCancelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleCancel = async () => {
    try {
      setIsLoading(true);
      await cancelSubscription(orderId);
      toast.success('Suscripción cancelada exitosamente');
      setIsOpen(false);
      if (typeof onCancelled === 'function') {
        onCancelled();
      }
      // Recargar la página después de cancelar
      window.location.reload();
    } catch (error) {
      console.error('Error al cancelar la suscripción:', error);
      toast.error('No se pudo cancelar la suscripción. Intenta nuevamente más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const [showOptions, setShowOptions] = useState(false);

  // Variantes de animación
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariant = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <>
      {/* Contenedor relativo para el botón y su dropdown */}
      <div className="relative inline-block">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowOptions(!showOptions);
          }}
          className="rounded-full h-8 w-8 p-0 flex items-center justify-center text-gray-200 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-gray-600"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">Opciones del curso</span>
        </Button>
        
        <AnimatePresence>
          {showOptions && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-gray-800/90 backdrop-blur-sm border border-gray-600 z-10"
            >
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-md border border-transparent hover:border-gray-600 transition-all"
                  role="menuitem"
                  onClick={() => {
                    setShowOptions(false);
                    setIsOpen(true);
                  }}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <span>Gestionar suscripción</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl mx-auto p-0 bg-[#09090b] overflow-hidden shadow-2xl rounded-2xl border border-white/10">
          <motion.div 
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]"
          >
            {/* Columna de información y alternativas */}
            <div className="p-10 border-r border-white/5 flex flex-col justify-between">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <DialogHeader className="space-y-4 text-left">
                  <motion.div variants={fadeInUp}>
                    <DialogTitle className="text-4xl font-serif font-medium text-white tracking-tight leading-tight">
                      Gestión de <br />
                      <span className="italic text-[var(--gold)]">Suscripción</span>
                    </DialogTitle>
                  </motion.div>
                  <motion.p variants={fadeInUp} className="text-base text-zinc-400 font-light">
                    Desde aquí puedes administrar tu acceso al curso.
                  </motion.p>
                </DialogHeader>
                
                <motion.div variants={fadeInUp} className="mt-12">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    ¿Necesitas ayuda?
                  </h3>
                  <div className="space-y-3">
                    <button className="w-full group flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left border border-white/5 hover:border-white/10">
                      <div className="p-2 bg-black/40 rounded-lg shadow-sm group-hover:shadow-md transition-all border border-white/5">
                        <HelpCircle className="h-5 w-5 text-[var(--gold)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Contactar a Soporte</p>
                        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                          Te ayudamos con problemas técnicos o de acceso a tu cuenta.
                        </p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Columna de beneficios y cancelación */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="p-10 bg-zinc-900/30 flex flex-col justify-between"
            >
              <div className="bg-[var(--gold)]/5 border border-[var(--gold)]/10 p-6 rounded-2xl shadow-sm relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <h3 className="font-semibold text-[var(--gold)] mb-4 text-lg relative z-10">Beneficios de tu Suscripción</h3>
                <motion.ul 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3 relative z-10"
                >
                  {[
                    'Acceso ilimitado a todos los materiales',
                    'Soporte académico y técnico prioritario',
                    'Acceso a nuevas actualizaciones',
                    'Comunidad exclusiva de estudiantes'
                  ].map((item, i) => (
                    <motion.li variants={itemVariant} key={i} className="flex items-start gap-2 text-zinc-300 text-sm font-medium">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--gold)] flex-shrink-0 shadow-[0_0_5px_var(--gold)]" />
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-8 pt-8 border-t border-white/5"
              >
                <div className="flex items-center gap-2 mb-2 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-bold text-base">¿Aún deseas cancelar?</p>
                </div>
                <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
                  Al cancelar, perderás acceso inmediato a los beneficios mencionados y tu progreso se pausará.
                </p>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)} 
                    className="text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    Volver
                  </Button>
                  <Button
                    variant="solid"
                    onClick={() => {
                      setIsOpen(false);
                      setIsConfirmOpen(true);
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-lg shadow-red-900/10 px-6 transition-all hover:border-red-500/40"
                  >
                    Proceder a Cancelación
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-2xl mx-auto p-8 bg-[#09090b] border border-white/10 text-white shadow-2xl">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.3 }}
             className="text-center"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
               <AlertCircle className="h-8 w-8 text-red-500" />
            </motion.div>
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif font-medium text-white tracking-tight">
                Confirmar <span className="text-red-500 italic">Cancelación</span>
              </DialogTitle>
            </DialogHeader>
            <p className="mt-3 text-zinc-400 text-lg">Estás a punto de cancelar tu suscripción. Esta acción es <span className="text-red-400 font-bold">irreversible</span>.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-red-950/10 p-6 rounded-xl border border-red-500/10 relative overflow-hidden"
          >
             {/* Pattern de advertencia sutil */}
             <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ef4444_10px,#ef4444_11px)]" />
             
            <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2 relative z-10">
              <AlertCircle className="h-4 w-4" />
              Consecuencias de la cancelación:
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 relative z-10 marker:text-red-500/50">
              <li><span className="font-semibold text-red-200">Pérdida de acceso:</span> No podrás ver los materiales ni el contenido exclusivo del curso.</li>
              <li><span className="font-semibold text-red-200">Pérdida de progreso:</span> Se eliminará tu avance y las actividades completadas.</li>
              <li><span className="font-semibold text-red-200">Facturación:</span> No se realizarán más cobros para este curso.</li>
              <li><span className="font-semibold text-red-200">Acceso restante:</span> Podrás acceder hasta el final de tu ciclo de facturación actual.</li>
              <li><span className="font-semibold text-red-200">Reinscripción:</span> Para volver a acceder, deberás inscribirte y pagar de nuevo.</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <p className="font-medium text-center text-zinc-400 mb-3">Para confirmar, escribe <span className="font-bold text-red-500 tracking-widest">CANCELAR</span> a continuación:</p>
            <input 
              type="text" 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.2em] text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all outline-none placeholder:text-zinc-700"
              placeholder="CANCELAR"
            />
          </motion.div>

          <DialogFooter className="flex justify-center gap-4 mt-8">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText('');
              }} 
              disabled={isLoading}
              className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              No, volver atrás
            </Button>
            <Button
              variant="solid"
              tone="pink"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={isLoading || confirmText !== 'CANCELAR'}
              className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-[0_0_20px_rgba(220,38,38,0.4)] px-8 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 hover:scale-105"
            >
              {isLoading ? 'Cancelando...' : 'Sí, cancelar suscripción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}