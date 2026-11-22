import StaffProvider from '@/components/StaffProvider';

export const metadata = { title: 'Atha Inn · Staff', robots: { index: false } };

export default function StaffLayout({ children }) {
  return <StaffProvider>{children}</StaffProvider>;
}
