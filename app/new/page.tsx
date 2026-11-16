import { Suspense } from 'react';
import PaymentForm from '@/components/PaymentForm';

export default function NewPaymentPage() {
  return (
    <Suspense>
      <PaymentForm />
    </Suspense>
  );
}
