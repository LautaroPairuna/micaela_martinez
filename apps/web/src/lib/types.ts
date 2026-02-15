export type Marca = { id:string; slug:string; nombre:string };
export type Categoria = { id:string; slug:string; nombre:string };
export type Producto = {
  id:string; slug:string; titulo:string; precio:number;
  precioLista?:number|null; imagen?:string|null;
  marca?:Marca|null; categoria?:Categoria|null;
  imagenes?:{ url:string; alt?:string; orden:number }[];
  ratingProm?: string|null; ratingConteo?: number;
};
export type Curso = {
  id:string; slug:string; titulo:string; precio:number; portadaUrl?:string|null;
  nivel:'BASICO'|'INTERMEDIO'|'AVANZADO';
  resumen?:string|null; descripcionMD?:string|null;
  _count?:{ modulos:number; resenas:number };
  modulos?:{ id:string; titulo:string; lecciones:{ id:string; titulo:string; duracion?:number; rutaSrc?:string|null; tipo?:'VIDEO'|'TEXTO'|'DOCUMENTO'|'QUIZ' }[] }[];
  duracionTotalS?: number;
};
