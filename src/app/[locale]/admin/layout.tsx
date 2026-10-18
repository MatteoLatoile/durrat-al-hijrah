import type {ReactNode} from 'react';
import {AdminAuthActions} from '@/components/AdminAuthActions';

export default function AdminLayout({
  children
}:{
  children:ReactNode
}) {
  return (
    <>
      {children}
      <AdminAuthActions/>
    </>
  );
}