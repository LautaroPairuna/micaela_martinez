// Letras (incluye acentos), números, espacio y algunos signos básicos. 0–80 chars.
export const searchPattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'-]{0,80}$/;
export const namePattern   = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ .'’-]{2,60}$/;
export const emailPattern  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phonePattern  = /^[0-9()+\s-]{6,20}$/;
