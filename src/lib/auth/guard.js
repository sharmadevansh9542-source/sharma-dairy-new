import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
const permissionByRole = { STAFF: ['collection.create','sale.create','payment.record','reports.view','expense.create','stock.adjust'] };
export async function apiUser(roles=['ADMIN'], permission=null) {
 const user=await getSessionUser();
 if(!user)return {user:null,response:Response.json({error:'Authentication required'},{status:401})};
 if(!roles.includes(user.role))return {user:null,response:Response.json({error:'Insufficient permissions'},{status:403})};
 if(user.role==='STAFF'&&permission){const grant=await prisma.userPermission.findFirst({where:{userId:user.id,permission:{key:permission}}});if(!grant)return {user:null,response:Response.json({error:'Permission not granted for this staff account'},{status:403})};}
 return {user,response:null};
}
export async function audit({actorId,action,entityType,entityId,after,before}) { try { await prisma.auditLog.create({data:{actorId,action,entityType,entityId,before:before??undefined,after:after??undefined}}); } catch(e) { console.error('audit log write failed',e?.message); } }
export const jsonError=(error,status=400)=>Response.json({error},{status});
