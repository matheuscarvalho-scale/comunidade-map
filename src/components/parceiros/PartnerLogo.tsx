import { ShoppingBag, BarChart3, Package, Building2, Truck, CreditCard, Megaphone, Users, Settings, Gift } from "lucide-react";
import olistLogo from "@/assets/olist-logo.png";

interface PartnerLogoProps {
  name: string;
  logoUrl: string | null;
  className?: string;
}

// Map partner names to specific icons/colors
const partnerIconMap: Record<string, { icon: React.ComponentType<{ className?: string }>, bgColor: string, iconColor: string }> = {
  "tiktok shop": {
    icon: ShoppingBag,
    bgColor: "bg-gradient-to-br from-[#00f2ea] to-[#ff0050]",
    iconColor: "text-white"
  },
  "base": {
    icon: CreditCard,
    bgColor: "bg-gradient-to-br from-blue-600 to-blue-700",
    iconColor: "text-white"
  },
  "bling": {
    icon: Package,
    bgColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    iconColor: "text-white"
  },
  "amazon": {
    icon: ShoppingBag,
    bgColor: "bg-gradient-to-br from-orange-400 to-orange-500",
    iconColor: "text-white"
  },
  "olist": {
    icon: Settings,
    bgColor: "bg-gradient-to-br from-violet-600 to-violet-700",
    iconColor: "text-white"
  },
  "mercado livre": {
    icon: ShoppingBag,
    bgColor: "bg-gradient-to-br from-yellow-400 to-yellow-500",
    iconColor: "text-black"
  },
  "shopee": {
    icon: ShoppingBag,
    bgColor: "bg-gradient-to-br from-orange-500 to-red-500",
    iconColor: "text-white"
  }
};

// Map categories to icons for fallback
const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "marketplace": ShoppingBag,
  "gestão/erp": Package,
  "erp": Package,
  "gestão": Settings,
  "logística": Truck,
  "financeiro": CreditCard,
  "marketing": Megaphone,
  "rh": Users,
  "analytics": BarChart3,
};

// Map specific partner names to local logo images
const partnerLocalLogos: Record<string, string> = {
  "olist": olistLogo,
};

export function PartnerLogo({ name, logoUrl, className = "" }: PartnerLogoProps) {
  const normalizedName = name.toLowerCase();
  const partnerConfig = partnerIconMap[normalizedName];
  const localLogo = partnerLocalLogos[normalizedName];

  // Use local logo image if available (highest priority)
  if (localLogo) {
    return (
      <div className={`h-12 w-12 rounded-lg overflow-hidden ${className}`}>
        <img
          src={localLogo}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  // If we have a valid logo URL, try to use it with fallback
  if (logoUrl) {
    const needsLargerLogo = ["iraha"].includes(normalizedName);
    const needsExtraLargeLogo = ["emori", "hands on", "scale.ia"].includes(normalizedName);
    const needsDarkBg = ["emori", "hands on", "scale.ia"].includes(normalizedName);
    const bgClass = needsDarkBg ? "bg-black" : "bg-white";

    return (
      <div className={`h-12 w-12 rounded-lg ${bgClass} flex items-center justify-center overflow-hidden ${needsLargerLogo ? "p-0.5" : needsExtraLargeLogo ? "p-0" : "p-2"} ${className}`}>
        <img 
          src={logoUrl} 
          alt={name}
          className={`h-full w-full ${needsExtraLargeLogo ? "object-cover scale-125" : "object-contain"}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && partnerConfig) {
              parent.className = `h-12 w-12 rounded-lg flex items-center justify-center ${partnerConfig.bgColor} ${className}`;
              const fallback = document.createElement('span');
              fallback.className = `${partnerConfig.iconColor} font-bold text-xl`;
              fallback.textContent = name.charAt(0).toUpperCase();
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
    );

  }
  
  // Use branded icon if available
  if (partnerConfig) {
    const IconComponent = partnerConfig.icon;
    return (
      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${partnerConfig.bgColor} ${className}`}>
        <IconComponent className={`h-6 w-6 ${partnerConfig.iconColor}`} />
      </div>
    );
  }
  
  // Fallback to first letter with primary color
  return (
    <div className={`h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
