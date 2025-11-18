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

  return (
    <>
      {/* Contenedor relativo para el botón y su dropdown; el posicionamiento absoluto lo define el padre si lo necesita */}
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
        
        {showOptions && (
          <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-gray-800/90 backdrop-blur-sm border border-gray-600 z-10">
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
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl mx-auto p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Columna de información y alternativas */}
            <div className="p-8 border-r border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-800">Gestión de Suscripción</DialogTitle>
                <p className="mt-2 text-sm text-gray-500">Desde aquí puedes administrar tu acceso al curso.</p>
              </DialogHeader>
              
              <div className="mt-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-base">¿Necesitas ayuda?</h3>
                <div className="space-y-3 text-sm">
                  <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <HelpCircle className="h-5 w-5 text-[var(--gold)]" />
                    <div>
                      <p className="font-medium text-gray-800">Contactar a Soporte</p>
                      <p className="text-gray-500">Te ayudamos con problemas técnicos o de acceso.</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Columna de beneficios y cancelación */}
            <div className="p-8 bg-gray-50 rounded-r-lg">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 text-base">Beneficios de tu Suscripción</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-blue-700">
                  <li>Acceso ilimitado a todos los materiales.</li>
                  <li>Soporte académico y técnico prioritario.</li>
                  <li>Acceso a nuevas actualizaciones y recursos.</li>
                  <li>Comunidad exclusiva de estudiantes.</li>
                </ul>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="font-semibold text-red-600 text-base">¿Aún deseas cancelar?</p>
                <p className="mt-1 text-sm text-gray-600">Al cancelar, perderás acceso a los beneficios mencionados y tu progreso actual.</p>
                <div className="mt-4 flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsOpen(false)} 
                    className="border-gray-300 text-gray-700"
                  >
                    Volver
                  </Button>
                  <Button
                    variant="solid"
                    tone="pink"
                    onClick={() => {
                      setIsOpen(false);
                      setIsConfirmOpen(true);
                    }}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Proceder a Cancelación
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-2xl mx-auto p-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <DialogHeader className="mt-4">
              <DialogTitle className="text-2xl font-bold text-red-600">Confirmar Cancelación</DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-gray-600">Estás a punto de cancelar tu suscripción. Esta acción es <span className="font-bold">irreversible</span>.</p>
          </div>

          <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-3">Consecuencias de la cancelación:</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-red-900">
              <li><span className="font-semibold">Pérdida de acceso:</span> No podrás ver los materiales ni el contenido exclusivo del curso.</li>
              <li><span className="font-semibold">Pérdida de progreso:</span> Se eliminará tu avance y las actividades completadas.</li>
              <li><span className="font-semibold">Facturación:</span> No se realizarán más cobros para este curso.</li>
              <li><span className="font-semibold">Acceso restante:</span> Podrás acceder hasta el final de tu ciclo de facturación actual.</li>
              <li><span className="font-semibold">Reinscripción:</span> Para volver a acceder, deberás inscribirte y pagar de nuevo.</li>
            </ul>
          </div>

          <div className="mt-6">
            <p className="font-medium text-center text-gray-700 mb-2">Para confirmar, escribe <span className="font-bold text-red-600">CANCELAR</span> a continuación:</p>
            <input 
              type="text" 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-red-400 focus:border-red-400 transition"
              placeholder="CANCELAR"
            />
          </div>

          <DialogFooter className="flex justify-end gap-3 mt-8">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText('');
              }} 
              disabled={isLoading}
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
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
            >
              {isLoading ? 'Cancelando...' : 'Sí, cancelar suscripción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}