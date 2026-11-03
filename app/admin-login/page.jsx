import { redirect } from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Administrator kirishi',robots:{index:false,follow:false}};
export default async function AdminLogin() {
  redirect('/login');
}
