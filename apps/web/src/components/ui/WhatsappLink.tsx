import Image from "next/image";

type WhatsappLinkProps = {
  phone?: string;
  text?: string;
  className?: string;
};

export default function WhatsappLink({
  phone = "5493875655951",
  text = "¡Hola! Me gustaría contactar con Micaela Martinez, Salta.",
  className = "",
}: WhatsappLinkProps) {
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
      className={`fixed bottom-5 right-6 z-50 inline-block rounded-full shadow-sm transition-transform hover:scale-[1.03] active:scale-95 ${className}`}
    >
      <Image
        src="/images/icons/ico-whatsapp-ventana.svg"
        alt="WhatsApp"
        width={64}
        height={64}
        loading="lazy"
        priority={false}
      />
    </a>
  );
}
