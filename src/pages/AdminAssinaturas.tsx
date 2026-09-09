import { useState, useMemo } from "react";
import { INTERNAL_MEMBER_USER_IDS } from "@/lib/internalMembers";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  RefreshCw,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Gift,
  Crown,
  Star,
  Rocket,
  Lock,
  Mail,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, addYears, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useExtraBenefits,
  useDeleteExtraBenefit,
  useUpdateExtraBenefit,
  BENEFIT_TYPE_LABELS,
  BENEFIT_STATUS_LABELS,
  BENEFIT_STATUS_COLORS,
  type ExtraBenefitWithProfile,
} from "@/hooks/useExtraBenefits";
import { ExtraBenefitFormModal } from "@/components/admin/ExtraBenefitFormModal";
import { MemberPdfModal } from "@/components/admin/MemberPdfModal";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CANCEL_REASON_OPTIONS } from "@/lib/cancelReasons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Plan features data for tracking what each plan includes
const PLAN_FEATURES: Record<string, { label: string; icon: React.ElementType; features: string[] }> = {
  basic: {
    label: "Basic",
    icon: Rocket,
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
    ],
  },
  pro: {
    label: "Pro",
    icon: Star,
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
      "Mentorias em grupo semanais",
      "Webinars exclusivos com especialistas",
      "Grupo VIP no WhatsApp",
      "VIP na próxima edição do MAP Experience",
      "50% off no MAP in Rio",
      "Evento presencial exclusivo 'MAP.IA'",
      "Evento presencial exclusivo 'Precifica MAP'",
    ],
  },
  business: {
    label: "Business",
    icon: Crown,
    features: [
      "Acesso completo à plataforma",
      "Trilha de Crescimento",
      "Formações e conteúdos exclusivos",
      "Networking com a comunidade",
      "Certificados de conclusão",
      "Mentorias em grupo semanais",
      "Webinars exclusivos com especialistas",
      "Grupo VIP no WhatsApp",
      "VIP na próxima edição do MAP Experience",
      "50% off no MAP in Rio",
      "Evento presencial exclusivo 'MAP.IA'",
      "Evento presencial exclusivo 'Precifica MAP'",
      "2 mentorias individuais focadas no seu negócio",
      "1 mentoria por mês com CEOs da MAP (João ou Pedro)",
      "Prioridade em todas as ações da comunidade",
    ],
  },
};

// Benefits that should have a checklist toggle (admin can mark as done/not done per member)
const CHECKABLE_BENEFITS: Record<string, string> = {
  "Grupo VIP no WhatsApp": "grupo_vip_whatsapp",
  "VIP na próxima edição do MAP Experience": "vip_map_experience",
  "50% off no MAP in Rio": "50off_map_in_rio",
  "Evento presencial exclusivo 'MAP.IA'": "evento_map_ia",
  "Evento presencial exclusivo 'Precifica MAP'": "evento_precifica_map",
};

const normalizePlan = (plan: string | null) => {
  if (!plan) return "basic";
  const lower = plan.toLowerCase();
  if (lower === "starter") return "basic";
  if (lower === "enterprise") return "business";
  return lower;
};

interface ProfileWithSubscription {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  whatsapp?: string | null;
}

const formatWhatsApp = (value: string | null | undefined): { formatted: string; digits: string } | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  const formatted = digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : digits.length === 10
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    : value;
  return { formatted, digits };
};


export default function AdminAssinaturas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileWithSubscription | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [extensionPeriod, setExtensionPeriod] = useState("12");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("customer_request");
  const [cancelDetail, setCancelDetail] = useState("");
  const ITEMS_PER_PAGE = 20;

  // Extra Benefits state
  const { data: benefits = [], isLoading: benefitsLoading } = useExtraBenefits();
  const deleteBenefitMutation = useDeleteExtraBenefit();
  const updateBenefitMutation = useUpdateExtraBenefit();
  const [benefitSearch, setBenefitSearch] = useState("");
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<ExtraBenefitWithProfile | null>(null);
  const [selectedBenefitMemberId, setSelectedBenefitMemberId] = useState<string | null>(null);
  const [pdfModalProfile, setPdfModalProfile] = useState<ProfileWithSubscription | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailChangeTarget, setEmailChangeTarget] = useState<ProfileWithSubscription | null>(null);
  const [newEmail, setNewEmail] = useState("");

  // Plan benefit checklist
  const { data: benefitChecklist = [] } = useQuery({
    queryKey: ["plan-benefit-checklist", selectedBenefitMemberId],
    queryFn: async () => {
      if (!selectedBenefitMemberId) return [];
      const { data, error } = await supabase
        .from("plan_benefit_checklist")
        .select("*")
        .eq("member_id", selectedBenefitMemberId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBenefitMemberId,
  });

  const toggleBenefitCheck = useMutation({
    mutationFn: async ({ memberId, benefitKey, completed }: { memberId: string; benefitKey: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("plan_benefit_checklist")
          .upsert({
            member_id: memberId,
            benefit_key: benefitKey,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: "member_id,benefit_key" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plan_benefit_checklist")
          .delete()
          .eq("member_id", memberId)
          .eq("benefit_key", benefitKey);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-benefit-checklist", selectedBenefitMemberId] });
    },
  });

  const { data: benefitProfiles = [], isLoading: benefitProfilesLoading } = useQuery({
    queryKey: ["benefit-profiles-search", benefitSearch],
    queryFn: async () => {
      const BENEFIT_INTERNAL_USER_IDS = INTERNAL_MEMBER_USER_IDS;
      const BENEFIT_INTERNAL_ROLES = ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"] as const;

      const [secondaryResult, rolesResult] = await Promise.all([
        supabase.from("secondary_logins").select("secondary_user_id").eq("is_active", true),
        supabase.from("user_roles").select("user_id").in("role", BENEFIT_INTERNAL_ROLES),
      ]);

      const secondaryUserIds = (secondaryResult.data || []).map((sl: any) => sl.secondary_user_id);
      const internalRoleUserIds = [...new Set((rolesResult.data || []).map(r => r.user_id))];
      const excludedUserIds = [...new Set([...BENEFIT_INTERNAL_USER_IDS, ...secondaryUserIds, ...internalRoleUserIds])];

      let query = supabase
        .from("profiles_admin" as any)
        .select("user_id, name, avatar_url, subscription_plan, subscription_status")
        .not("user_id", "in", `(${excludedUserIds.join(",")})`)
        .in("subscription_status", ["active", "expired"])
        .order("name", { ascending: true })
        .limit(benefitSearch ? 50 : 1000);

      if (benefitSearch) {
        query = query.ilike("name", `%${benefitSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Array<{ user_id: string; name: string | null; avatar_url: string | null; subscription_plan: string | null; subscription_status: string | null }>;
    },
  });

  // Fetch profiles with pagination and search
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions", page, searchTerm],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const INTERNAL_USER_IDS = INTERNAL_MEMBER_USER_IDS;

      const INTERNAL_ROLES = ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"] as const;

      const [secondaryResult, rolesResult] = await Promise.all([
        supabase
          .from("secondary_logins")
          .select("secondary_user_id")
          .eq("is_active", true),
        supabase
          .from("user_roles")
          .select("user_id")
          .in("role", INTERNAL_ROLES),
      ]);

      const secondaryUserIds = (secondaryResult.data || []).map((sl: any) => sl.secondary_user_id);
      const internalRoleUserIds = [...new Set((rolesResult.data || []).map(r => r.user_id))];
      const excludedUserIds = [...new Set([...INTERNAL_USER_IDS, ...secondaryUserIds, ...internalRoleUserIds])];

      let query = supabase
        .from("profiles_admin" as any)
        .select("id, user_id, name, avatar_url, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, created_at", { count: "exact" })
        .in("subscription_status", ["active", "expired"])
        .not("user_id", "in", `(${excludedUserIds.join(",")})`);



      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order("subscription_end_date", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data || []) as unknown as ProfileWithSubscription[];
      const userIds = rows.map((p) => p.user_id);
      let whatsappMap: Record<string, string | null> = {};
      
      if (userIds.length > 0) {
        const { data: onboardingData } = await supabase
          .from("user_onboarding")
          .select("user_id, whatsapp")
          .in("user_id", userIds);

        (onboardingData || []).forEach((o) => {
          whatsappMap[o.user_id] = o.whatsapp;
        });
      }

      const profiles = rows.map((p) => ({
        ...p,
        whatsapp: whatsappMap[p.user_id] ?? null,
      })) as ProfileWithSubscription[];

      return { profiles, count: count || 0 };
    },
  });

  const profiles = data?.profiles || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch secondary logins grouped by primary user (for the current page)
  const primaryUserIds = profiles.map((p) => p.user_id);
  const { data: secondaryByPrimary = {} } = useQuery({
    queryKey: ["secondary-logins-by-primary", primaryUserIds],
    enabled: primaryUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("secondary_logins")
        .select("primary_user_id, secondary_name, secondary_email, relationship")
        .eq("is_active", true)
        .in("primary_user_id", primaryUserIds);
      if (error) throw error;
      const map: Record<string, Array<{ name: string; email: string; relationship: string | null }>> = {};
      (data || []).forEach((sl: any) => {
        if (!map[sl.primary_user_id]) map[sl.primary_user_id] = [];
        map[sl.primary_user_id].push({
          name: sl.secondary_name,
          email: sl.secondary_email,
          relationship: sl.relationship,
        });
      });
      return map;
    },
  });

  // Fetch emails for all members (via RPC that already exposes email)
  const { data: emailByUserId = {} } = useQuery({
    queryKey: ["admin-subscriptions-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inactive_members", { inactive_days: 0, limit_count: 5000 });
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[] || []).forEach((m) => {
        if (m.user_id && m.email) map[m.user_id] = m.email;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });

  const extendMutation = useMutation({
    mutationFn: async ({ profileId, months }: { profileId: string; months: number }) => {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) throw new Error("Profile not found");

      const currentEndDate = profile.subscription_end_date 
        ? new Date(profile.subscription_end_date)
        : new Date();
      
      const newEndDate = addMonths(currentEndDate, months);

      const { error } = await supabase
        .from("profiles_admin" as any)
        .update({
          subscription_end_date: newEndDate.toISOString(),
          subscription_status: "active",
        })
        .eq("id", profileId);

      if (error) throw error;
      return newEndDate;
    },
    onSuccess: (newEndDate) => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({
        title: "Assinatura estendida!",
        description: `Nova data de validade: ${format(newEndDate, "dd/MM/yyyy")}`,
      });
      setExtendDialogOpen(false);
      setSelectedProfile(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível estender a assinatura.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ profileId, reason, detail }: { profileId: string; reason: string; detail: string }) => {
      const { error } = await supabase
        .from("profiles_admin" as any)
        .update({
          subscription_status: "expired",
          cancel_reason: reason,
          cancel_reason_detail: detail.trim() || (reason === "other" ? "não informado" : null),
          cancel_source: "admin",
        })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast({ title: "Assinatura cancelada", description: "Motivo registrado com sucesso." });
      setCancelDialogOpen(false);
      setCancelDetail("");
      setSelectedProfile(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível cancelar a assinatura.", variant: "destructive" });
    },
  });

  // No longer using filteredBenefits - benefits are shown per-member now

  const benefitStats = useMemo(() => {
    const active = benefits.filter((b) => ["concedido", "em_uso", "pendente"].includes(b.status)).length;
    const expired = benefits.filter((b) => b.status === "expirado").length;
    const delivered = benefits.filter((b) => b.status === "entregue").length;
    return { total: benefits.length, active, expired, delivered };
  }, [benefits]);

  const today = new Date();
  
  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
  };

  const getStatusBadge = (profile: ProfileWithSubscription) => {
    if (profile.subscription_status === "refunded") {
      return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Reembolso</Badge>;
    }
    if (profile.subscription_status === "expired") {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Expirada</Badge>;
    }
    if (!profile.subscription_end_date) {
      return <Badge variant="outline">Sem data definida</Badge>;
    }
    const daysRemaining = differenceInDays(new Date(profile.subscription_end_date), today);
    if (daysRemaining < 0) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Expirada</Badge>;
    } else if (daysRemaining <= 30) {
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Expirando</Badge>;
    } else {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Ativa</Badge>;
    }
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), today);
  };

  const handleExtend = (profile: ProfileWithSubscription) => {
    setSelectedProfile(profile);
    setExtendDialogOpen(true);
  };

  const confirmExtend = () => {
    if (!selectedProfile) return;
    extendMutation.mutate({
      profileId: selectedProfile.id,
      months: parseInt(extensionPeriod),
    });
  };

  const emailChangeMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const res = await supabase.functions.invoke("update-user-email", {
        body: { user_id: userId, new_email: email },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao alterar e-mail");
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      toast({ title: "E-mail alterado com sucesso!" });
      setEmailDialogOpen(false);
      setEmailChangeTarget(null);
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleEmailChange = (profile: ProfileWithSubscription) => {
    setEmailChangeTarget(profile);
    setNewEmail("");
    setEmailDialogOpen(true);
  };

  const confirmEmailChange = () => {
    if (!emailChangeTarget || !newEmail.trim()) return;
    emailChangeMutation.mutate({ userId: emailChangeTarget.user_id, email: newEmail.trim() });
  };

  const handleDeleteBenefit = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este benefício?")) return;
    try {
      await deleteBenefitMutation.mutateAsync(id);
      toast({ title: "Benefício excluído" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isBenefitExpired = (b: ExtraBenefitWithProfile) =>
    b.expires_at && new Date(b.expires_at) < new Date() && b.status !== "expirado" && b.status !== "cancelado" && b.status !== "entregue";

  const ProfileTable = ({ profiles, emptyMessage }: { profiles: ProfileWithSubscription[]; emptyMessage: string }) => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead className="hidden sm:table-cell">Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Validade</TableHead>
            <TableHead className="hidden lg:table-cell">Dias Restantes</TableHead>
            <TableHead className="hidden md:table-cell">Contato</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            profiles.map((profile) => {
              const daysRemaining = getDaysRemaining(profile.subscription_end_date);
              return (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <button
                          className="font-medium text-xs sm:text-sm truncate max-w-[160px] sm:max-w-none text-left hover:text-primary hover:underline transition-colors"
                          onClick={() => setPdfModalProfile(profile)}
                        >
                          {profile.name}
                        </button>
                        {(emailByUserId as Record<string, string>)[profile.user_id] && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-[240px]">
                            {(emailByUserId as Record<string, string>)[profile.user_id]}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const secs = (secondaryByPrimary as Record<string, Array<{ name: string; email: string; relationship: string | null }>>)[profile.user_id];
                        if (!secs || secs.length === 0) return null;
                        return (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center gap-1 rounded-full border border-[#BFFF00]/30 bg-[#BFFF00]/10 px-2 py-0.5 text-[10px] font-medium text-[#BFFF00] cursor-help"
                                  aria-label={`${secs.length} ${secs.length === 1 ? "perfil secundário" : "perfis secundários"} vinculado`}
                                  data-ga="admin-subscriptions-secondary-badge"
                                >
                                  <Users className="h-3 w-3" />
                                  {secs.length}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold mb-1">
                                    {secs.length === 1 ? "Perfil secundário" : `${secs.length} perfis secundários`}
                                  </p>
                                  {secs.map((s, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="font-medium">{s.name}</span>
                                      {s.relationship && (
                                        <span className="text-muted-foreground"> · {s.relationship}</span>
                                      )}
                                      <div className="text-muted-foreground text-[10px]">{s.email}</div>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-xs">
                      {profile.subscription_plan || "Não definido"}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(profile)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {profile.subscription_status === "refunded"
                      ? "-"
                      : profile.subscription_end_date
                        ? format(new Date(profile.subscription_end_date), "dd/MM/yyyy")
                        : "-"
                    }
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {profile.subscription_status === "refunded"
                      ? "-"
                      : daysRemaining !== null ? (
                          <span className={daysRemaining < 0 ? "text-red-500" : daysRemaining <= 30 ? "text-yellow-500" : ""}>
                            {daysRemaining} dias
                          </span>
                        ) : "-"
                    }
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(() => {
                      const wpp = formatWhatsApp(profile.whatsapp);
                      if (!wpp) return <span className="text-muted-foreground text-sm">-</span>;
                      return (
                        <a
                          href={`https://wa.me/55${wpp.digits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {wpp.formatted}
                        </a>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmailChange(profile)}
                        className="gap-1.5 text-xs"
                        title="Alterar e-mail"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtend(profile)}
                        className="gap-1.5 text-xs sm:text-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Estender</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedProfile(profile);
                          setCancelReason("customer_request");
                          setCancelDetail("");
                          setCancelDialogOpen(true);
                        }}
                        className="gap-1.5 text-xs text-red-400 hover:text-red-300"
                        title="Cancelar assinatura"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Gestão de Assinaturas</h1>
          <p className="text-muted-foreground">
            Gerencie as assinaturas e benefícios extras dos membros.
          </p>
        </div>

        <Tabs defaultValue="assinaturas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assinaturas" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="beneficios" className="gap-2">
              <Gift className="h-4 w-4" />
              Benefícios Extras
            </TabsTrigger>
          </TabsList>

          {/* Tab: Assinaturas */}
          <TabsContent value="assinaturas" className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Membros ({totalCount})
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">Página {page} de {totalPages || 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ProfileTable profiles={profiles} emptyMessage="Nenhum membro encontrado" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Benefícios */}
          <TabsContent value="beneficios" className="space-y-4">
            {/* Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                {[
                  { label: "Total Extras", value: benefitStats.total, color: "text-foreground" },
                  { label: "Ativos", value: benefitStats.active, color: "text-emerald-400" },
                  { label: "Entregues", value: benefitStats.delivered, color: "text-muted-foreground" },
                  { label: "Expirados", value: benefitStats.expired, color: "text-red-400" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button onClick={() => { setEditingBenefit(null); setBenefitModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Benefício Extra
              </Button>
            </div>

            {/* Search member */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar membro para ver benefícios do plano..."
                    value={benefitSearch}
                    onChange={(e) => { setBenefitSearch(e.target.value); setSelectedBenefitMemberId(null); }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected member detail view */}
            {selectedBenefitMemberId ? (() => {
              const member = benefitProfiles.find(p => p.user_id === selectedBenefitMemberId);
              if (!member) return null;
              const plan = normalizePlan(member.subscription_plan);
              const planData = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
              const PlanIcon = planData.icon;
              const memberExtras = benefits.filter(b => b.member_id === selectedBenefitMemberId);
              const activeExtras = memberExtras.filter(b => ["concedido", "em_uso", "pendente"].includes(b.status));
              const completedExtras = memberExtras.filter(b => ["entregue", "expirado", "cancelado"].includes(b.status));

              return (
                <div className="space-y-4">
                  {/* Member header */}
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedBenefitMemberId(null)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{member.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs gap-1">
                              <PlanIcon className="h-3 w-3" />
                              {planData.label}
                            </Badge>
                            <Badge variant={member.subscription_status === "active" ? "default" : "secondary"} className="text-xs">
                              {member.subscription_status === "active" ? "Ativo" : member.subscription_status || "Indefinido"}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => { setEditingBenefit(null); setBenefitModalOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar Extra
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plan benefits */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <PlanIcon className="h-5 w-5 text-primary" />
                        Benefícios do Plano {planData.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-1.5">
                        {planData.features.map((feature, i) => {
                          const checkKey = CHECKABLE_BENEFITS[feature];
                          const isCheckable = !!checkKey;
                          const isChecked = isCheckable && benefitChecklist.some(
                            (c: any) => c.benefit_key === checkKey && c.completed
                          );

                          if (isCheckable) {
                            return (
                              <label
                                key={i}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  disabled={toggleBenefitCheck.isPending}
                                  onCheckedChange={(checked) => {
                                    if (selectedBenefitMemberId) {
                                      toggleBenefitCheck.mutate({
                                        memberId: selectedBenefitMemberId,
                                        benefitKey: checkKey,
                                        completed: !!checked,
                                      });
                                    }
                                  }}
                                />
                                <span className={`text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                                  {feature}
                                </span>
                              </label>
                            );
                          }

                          return (
                            <div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Extras */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Gift className="h-5 w-5 text-primary" />
                          Benefícios Extras ({memberExtras.length})
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {memberExtras.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum benefício extra concedido</p>
                      ) : (
                        <div className="space-y-2">
                          {[...activeExtras, ...completedExtras].map((b) => (
                            <div
                              key={b.id}
                              className={`flex items-center gap-3 p-2 rounded-lg border ${isBenefitExpired(b) ? "border-red-500/30 bg-red-500/5" : "border-border"}`}
                            >
                              {isBenefitExpired(b) && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{BENEFIT_TYPE_LABELS[b.benefit_type]}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${BENEFIT_STATUS_COLORS[b.status]}`}>
                                    {BENEFIT_STATUS_LABELS[b.status]}
                                  </Badge>
                                  {b.expires_at && (
                                    <span className={`text-[10px] ${isBenefitExpired(b) ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                                      Exp: {format(new Date(b.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(b.granted_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-6 w-6 text-xs" disabled={b.quantity_used <= 0 || updateBenefitMutation.isPending} onClick={() => updateBenefitMutation.mutate({ id: b.id, quantity_used: b.quantity_used - 1 })}>-</Button>
                                <span className="text-sm min-w-[40px] text-center font-medium">{b.quantity_used}/{b.quantity_granted}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6 text-xs" disabled={b.quantity_used >= b.quantity_granted || updateBenefitMutation.isPending} onClick={() => updateBenefitMutation.mutate({ id: b.id, quantity_used: b.quantity_used + 1 })}>+</Button>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingBenefit(b); setBenefitModalOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteBenefit(b.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })() : (
              /* Member list */
              <div className="space-y-2">
                {benefitProfilesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : benefitProfiles.length === 0 ? (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum membro encontrado</CardContent></Card>
                ) : (
                  benefitProfiles.map((p) => {
                    const plan = normalizePlan(p.subscription_plan);
                    const planData = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
                    const PlanIcon = planData.icon;
                    const memberExtrasCount = benefits.filter(b => b.member_id === p.user_id).length;
                    const activeExtrasCount = benefits.filter(b => b.member_id === p.user_id && ["concedido", "em_uso", "pendente"].includes(b.status)).length;

                    return (
                      <Card
                        key={p.user_id}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setSelectedBenefitMemberId(p.user_id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={p.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {p.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="capitalize text-[10px] gap-1">
                                  <PlanIcon className="h-3 w-3" />
                                  {planData.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {planData.features.length} benefícios do plano
                                </span>
                              </div>
                            </div>
                            {memberExtrasCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {activeExtrasCount > 0 ? `${activeExtrasCount} extra${activeExtrasCount > 1 ? "s" : ""} ativo${activeExtrasCount > 1 ? "s" : ""}` : `${memberExtrasCount} extra${memberExtrasCount > 1 ? "s" : ""}`}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Subscription Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Assinatura</DialogTitle>
              <DialogDescription>
                Registre o motivo do cancelamento de {selectedProfile?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo</label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Observação {cancelReason === "other" ? "(obrigatória)" : "(opcional)"}
                </label>
                <Textarea
                  value={cancelDetail}
                  onChange={(e) => setCancelDetail(e.target.value.slice(0, 500))}
                  placeholder="Detalhe o contexto do cancelamento"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
              <Button
                variant="destructive"
                disabled={
                  cancelMutation.isPending ||
                  (cancelReason === "other" && cancelDetail.trim().length === 0)
                }
                onClick={() =>
                  selectedProfile &&
                  cancelMutation.mutate({
                    profileId: selectedProfile.id,
                    reason: cancelReason,
                    detail: cancelDetail,
                  })
                }
              >
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Extend Subscription Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Estender Assinatura</DialogTitle>
              <DialogDescription>
                Estenda a assinatura de {selectedProfile?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedProfile && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data atual de expiração:</span>
                    <span className="font-medium">
                      {selectedProfile.subscription_end_date
                        ? format(new Date(selectedProfile.subscription_end_date), "dd/MM/yyyy")
                        : "Não definida"
                      }
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Período de extensão</label>
                <Select value={extensionPeriod} onValueChange={setExtensionPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses (1 ano)</SelectItem>
                    <SelectItem value="24">24 meses (2 anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedProfile && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <span className="text-muted-foreground">Nova data de expiração: </span>
                  <span className="font-medium">
                    {format(
                      addMonths(
                        selectedProfile.subscription_end_date 
                          ? new Date(selectedProfile.subscription_end_date) 
                          : new Date(),
                        parseInt(extensionPeriod)
                      ),
                      "dd/MM/yyyy"
                    )}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmExtend} 
                disabled={extendMutation.isPending}
                className="gap-2"
              >
                {extendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Confirmar Extensão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Change Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar E-mail</DialogTitle>
              <DialogDescription>
                Altere o e-mail de {emailChangeTarget?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Novo e-mail</label>
                <Input
                  type="email"
                  placeholder="novo@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmEmailChange}
                disabled={emailChangeMutation.isPending || !newEmail.trim()}
                className="gap-2"
              >
                {emailChangeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Confirmar Alteração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Extra Benefit Form Modal */}
        <ExtraBenefitFormModal
          open={benefitModalOpen}
          onOpenChange={setBenefitModalOpen}
          benefit={editingBenefit}
          memberId={selectedBenefitMemberId || undefined}
        />

        {/* Member PDF Modal */}
        <MemberPdfModal
          open={!!pdfModalProfile}
          onOpenChange={(open) => !open && setPdfModalProfile(null)}
          member={pdfModalProfile}
        />
      </div>
    </MainLayout>
  );
}
