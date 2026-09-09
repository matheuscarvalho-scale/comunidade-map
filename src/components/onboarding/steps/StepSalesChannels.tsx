import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface StepSalesChannelsProps {
  salesChannels: string[];
  ecommercePlatform: string;
  salesChannelOther: string;
  onUpdate: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const channelOptions = [
  { id: "site-proprio", label: "Site Próprio", icon: "🌐" },
  { id: "amazon", label: "Amazon", icon: "📦" },
  { id: "shein", label: "Shein", icon: "👗" },
  { id: "shopee", label: "Shopee", icon: "🟠" },
  { id: "temu", label: "Temu", icon: "🛒" },
  { id: "tiktok-shop", label: "Tiktok Shop", icon: "🎵" },
  { id: "mercado-livre", label: "Mercado Livre", icon: "🟡" },
  { id: "kwai-shop", label: "Kwai Shop", icon: "🎬" },
  { id: "magalu-netshoes", label: "Magalu/Netshoes", icon: "🏬" },
  { id: "outros", label: "Outros", icon: "➕" },
];

export function StepSalesChannels({
  salesChannels,
  ecommercePlatform,
  salesChannelOther,
  onUpdate,
  onNext,
  onBack,
}: StepSalesChannelsProps) {
  const toggleChannel = (id: string) => {
    const updated = salesChannels.includes(id)
      ? salesChannels.filter((v) => v !== id)
      : [...salesChannels, id];
    onUpdate("sales_channels", updated);
    if (id === "outros" && salesChannels.includes(id)) {
      onUpdate("sales_channel_other", "");
    }
  };

  const showEcommercePlatform = false;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <ShoppingCart className="w-6 h-6 text-lime" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Em quais canais você vende?
        </h2>
        <p className="text-muted-foreground">
          Selecione todos que se aplicam
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3">
          {channelOptions.map((channel) => {
            const isSelected = salesChannels.includes(channel.id);
            return (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-lime bg-lime/10"
                    : "border-border bg-surface hover:border-lime/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    className="border-lime data-[state=checked]:bg-lime data-[state=checked]:text-black"
                  />
                  <span className="text-lg">{channel.icon}</span>
                  <span className="text-sm font-medium text-foreground">{channel.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showEcommercePlatform && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-2"
            >
              <label className="text-sm font-medium text-foreground mb-1.5 block">Qual plataforma?</label>
              <Input
                placeholder="Ex: Shopify, WooCommerce, Nuvemshop..."
                value={ecommercePlatform}
                onChange={(e) => onUpdate("ecommerce_platform", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {salesChannels.includes("outros") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-2"
            >
              <label className="text-sm font-medium text-foreground mb-1.5 block">Qual canal?</label>
              <Input
                placeholder="Digite o nome do canal..."
                value={salesChannelOther}
                onChange={(e) => onUpdate("sales_channel_other", e.target.value)}
                className="bg-surface border-border"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1 border-border">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={salesChannels.length === 0 || (salesChannels.includes("outros") && !salesChannelOther.trim())}
          className="flex-1 bg-lime text-black hover:bg-lime/90 disabled:opacity-50"
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
