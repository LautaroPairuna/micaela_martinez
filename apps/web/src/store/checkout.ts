// src/store/checkout.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Direccion } from '@/lib/sdk/userApi';

export type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirmation';



export interface PaymentMethod {
  id: string;
  type: 'mercadopago' | 'transfer';
  name: string;
  description: string;
}

export interface CheckoutData {
  // Dirección
  shippingAddress: Direccion | null;
  billingAddress: Direccion | null;
  useSameAddress: boolean;
  
  // Pago
  selectedPayment: PaymentMethod | null;
  paymentMethods: PaymentMethod[];
  
  // Estado del proceso
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
  
  // Orden
  orderId: string | null;
  paymentReference: string | null;
}

export interface CheckoutStore extends CheckoutData {
  // Navegación
  setStep: (step: CheckoutStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepCompleted: (step: CheckoutStep) => void;
  
  // Dirección
  setShippingAddress: (address: Direccion | null) => void;
  setBillingAddress: (address: Direccion | null) => void;
  setUseSameAddress: (useSame: boolean) => void;
  

  
  // Pago
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  setSelectedPayment: (payment: PaymentMethod | null) => void;
  
  // Orden
  setOrderId: (orderId: string | null) => void;
  setPaymentReference: (reference: string | null) => void;
  
  // Reset
  reset: () => void;
}

const steps: CheckoutStep[] = ['cart', 'address', 'payment', 'confirmation'];

const initialState: CheckoutData = {
  shippingAddress: null,
  billingAddress: null,
  useSameAddress: true,
  selectedPayment: null,
  paymentMethods: [
    {
      id: 'mercadopago',
      type: 'mercadopago',
      name: 'MercadoPago',
      description: 'Tarjeta de crédito, débito o efectivo'
    },
    {
      id: 'transfer',
      type: 'transfer',
      name: 'Transferencia Bancaria',
      description: 'Pago por transferencia o depósito'
    }
  ],
  currentStep: 'cart',
  completedSteps: [],
  orderId: null,
  paymentReference: null,
};

export const useCheckout = create<CheckoutStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setStep: (step) => set({ currentStep: step }),
      
      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] });
        }
      },
      
      prevStep: () => {
        const { currentStep } = get();
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] });
        }
      },
      
      markStepCompleted: (step) => {
        const { completedSteps } = get();
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] });
        }
      },
      
      setShippingAddress: (address) => set({ shippingAddress: address }),
      setBillingAddress: (address) => set({ billingAddress: address }),
      setUseSameAddress: (useSame) => {
        const state = get();
        set({ 
          useSameAddress: useSame,
          billingAddress: useSame ? state.shippingAddress : state.billingAddress
        });
      },
      

      
      setPaymentMethods: (methods) => set({ paymentMethods: methods }),
      setSelectedPayment: (payment) => set({ selectedPayment: payment }),
      
      setOrderId: (orderId) => set({ orderId }),
      setPaymentReference: (reference) => set({ paymentReference: reference }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'checkout-storage',
      partialize: (state) => ({
        shippingAddress: state.shippingAddress,
        billingAddress: state.billingAddress,
        useSameAddress: state.useSameAddress,
        selectedPayment: state.selectedPayment,
      }),
    }
  )
);

// Selectores
export const checkoutSelectors = {
  canProceedFromCart: () => true, // Siempre se puede proceder del carrito
  canProceedFromAddress: (state: CheckoutStore) => 
    state.shippingAddress !== null && 
    (state.useSameAddress || state.billingAddress !== null),
  canProceedFromPayment: (state: CheckoutStore) => 
    state.selectedPayment !== null,
  isStepCompleted: (state: CheckoutStore, step: CheckoutStep) => 
    state.completedSteps.includes(step),
  getCurrentStepIndex: (state: CheckoutStore) => 
    steps.indexOf(state.currentStep),
  getTotalSteps: () => steps.length,
};