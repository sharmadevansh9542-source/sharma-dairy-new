import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
export default async function UserDashboard(){const user=await getSessionUser();if(!user)redirect('/login');if(user.role==='ADMIN')redirect('/admin/dashboard');if(user.role==='FARMER')redirect('/farmer/dashboard');if(user.role==='CUSTOMER')redirect('/customer/dashboard');if(user.role==='STAFF')redirect('/staff/dashboard');redirect('/login')}
