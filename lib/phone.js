export function normalizeUzPhone(value){
 const digits=String(value||'').replace(/\D/g,'');
 if(digits.length===12&&digits.startsWith('998'))return `+${digits}`;
 if(digits.length===9)return `+998${digits}`;
 if(digits.length===10&&digits.startsWith('0'))return `+998${digits.slice(1)}`;
 return null;
}
