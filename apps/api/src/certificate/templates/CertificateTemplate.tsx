import React from 'react';

interface CertificateProps {
  studentName: string;
  courseName: string;
  date: string;
}

export const CertificateTemplate: React.FC<CertificateProps> = ({
  studentName,
  courseName,
  date,
}) => {
  return (
    <div className="relative bg-white border-[10px] border-gold shadow-2xl bg-dots box-border text-center overflow-hidden" 
         style={{ width: '1123px', height: '794px', padding: '40px' }}>
      
      {/* Borde interno decorativo */}
      <div className="h-full border-2 border-gold flex flex-col justify-center items-center relative p-8">
        
        {/* Marca de agua */}
        <div className="absolute inset-0 flex justify-center items-center opacity-[0.03] pointer-events-none select-none z-0">
          <span className="text-[350px]">🎓</span>
        </div>

        {/* Contenido */}
        <div className="relative z-10 w-full flex flex-col items-center">
          
          {/* Logo */}
          <div className="mb-8 font-serif text-2xl font-bold text-gold uppercase tracking-[2px]">
            Mica Pestañas Academy
          </div>
          
          {/* Título */}
          <h1 className="font-serif text-[60px] text-gray-900 m-0 uppercase tracking-[4px] leading-tight">
            Certificado
          </h1>
          <div className="text-xl text-gray-500 mt-2 uppercase tracking-[3px]">
            de Finalización
          </div>
          
          {/* Presentado a */}
          <div className="text-lg mt-10 italic text-gray-600 font-light">
            Este certificado se otorga a
          </div>
          
          {/* Nombre del Estudiante */}
          <div className="font-serif text-[48px] text-gold mt-6 mb-4 border-b border-gray-200 pb-2 inline-block min-w-[500px]">
            {studentName}
          </div>
          
          {/* Texto intermedio */}
          <div className="text-lg mt-4 text-gray-600">
            Por haber completado exitosamente el curso
          </div>
          
          {/* Nombre del Curso */}
          <div className="text-3xl font-bold text-gray-800 mt-4 mb-12 max-w-[800px] leading-snug">
            {courseName}
          </div>
          
          {/* Footer / Firmas */}
          <div className="flex justify-between w-[80%] mt-8 px-10">
            
            {/* Bloque Fecha */}
            <div className="text-center w-64">
              <div className="text-base text-gray-600 font-medium mb-2">{date}</div>
              <div className="h-px bg-transparent mb-2"></div> {/* Spacer visual */}
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Fecha</div>
            </div>
            
            {/* Bloque Firma */}
            <div className="text-center w-64">
              <div className="h-16 flex items-end justify-center pb-1">
                 {/* Aquí podría ir una imagen de firma */}
                 <span className="font-serif text-2xl text-gray-800 italic">Micaela Pestañas</span>
              </div>
              <div className="h-px bg-gray-800 w-full mb-2"></div>
              <div className="text-sm font-bold text-gray-800 uppercase tracking-wider">Directora Académica</div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
};
