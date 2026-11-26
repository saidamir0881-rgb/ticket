export async function findVerifiedPhoneUser(admin,phone){
 for(let page=1;page<=100;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});
  if(error)throw Object.assign(new Error('Akkauntni tekshirib bo‘lmadi. Qayta urinib ko‘ring.'),{status:503});
  const user=data.users.find(item=>item.phone===phone&&item.phone_confirmed_at);
  if(user)return user.id;
  if(data.users.length<1000)return null;
 }
 throw Object.assign(new Error('Akkauntlar ro‘yxati juda katta. Yordam xizmatiga murojaat qiling.'),{status:503});
}
