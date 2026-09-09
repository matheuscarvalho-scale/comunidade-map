import { useState, useEffect } from "react";
import { 
  Flame, 
  CheckCircle2, 
  Users, 
  GraduationCap, 
  MessageSquare, 
  Trophy,
  Zap,
  ArrowRight,
  Star,
  BookOpen,
  Video,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { SEOHead } from "@/components/SEOHead";
import logoMapDark from "@/assets/logo-map-dark.png";
import logoMapLight from "@/assets/logo-map-light.png";

const CHECKOUT_URL = "https://pay.hub.la/lCG5QAV4ke50HOqe5kVd";

const benefits = [
  "Plataforma exclusiva de cursos e formações",
  "Mentorias semanais ao vivo",
  "Grupo exclusivo no WhatsApp",
  "Conteúdos semanais atualizados",
  "Precifica MAP incluso",
  "Comunidade ativa de empreendedores",
  "Suporte prioritário"
];

const features = [
  {
    icon: GraduationCap,
    title: "Formações Completas",
    description: "Cursos estruturados do básico ao avançado em e-commerce, dropshipping e marketing digital."
  },
  {
    icon: Video,
    title: "Mentorias ao Vivo",
    description: "Sessões semanais com especialistas para tirar dúvidas e acelerar seus resultados."
  },
  {
    icon: Users,
    title: "Comunidade Ativa",
    description: "Conecte-se com outros empreendedores, troque experiências e cresça junto."
  },
  {
    icon: Download,
    title: "Recursos Exclusivos",
    description: "Templates, planilhas e ferramentas prontas para usar no seu negócio."
  },
  {
    icon: Trophy,
    title: "Gamificação",
    description: "Sistema de conquistas e rankings para manter você motivado na jornada."
  },
  {
    icon: MessageSquare,
    title: "Networking",
    description: "Encontre parceiros, fornecedores e conexões estratégicas para seu negócio."
  }
];

const testimonials = [
  {
    name: "Lucas Silva",
    role: "Dropshipper",
    content: "Em 3 meses consegui sair do zero para R$ 15k de faturamento. A comunidade foi essencial!",
    avatar: "LS"
  },
  {
    name: "Marina Costa",
    role: "E-commerce Owner",
    content: "As mentorias me ajudaram a escalar minha loja de R$ 5k para R$ 50k mensais.",
    avatar: "MC"
  },
  {
    name: "Pedro Santos",
    role: "Empreendedor Digital",
    content: "O networking aqui vale mais que qualquer curso. Já fechei várias parcerias.",
    avatar: "PS"
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      if (theme === "system") {
        setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
      } else {
        setIsDarkMode(theme === "dark");
      }
    };
    
    checkDarkMode();
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDarkMode);
    return () => mediaQuery.removeEventListener("change", checkDarkMode);
  }, [theme]);

  const handleCTA = () => {
    navigate("/planos");
  };

  const handleLogin = () => {
    navigate("/auth");
  };

  const landingJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MAP Acelera",
    "url": "https://acelera.mapeducacao.com",
    "logo": "https://acelera.mapeducacao.com/images/logo-map-email.png",
    "description": "Ecossistema de empreendedores que se desenvolvem constantemente no mundo online. Formações, mentorias e networking para e-commerce.",
    "sameAs": []
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Como recebo acesso após o pagamento?",
        "acceptedAnswer": { "@type": "Answer", "text": "Após a confirmação do pagamento, você receberá um email com suas credenciais de acesso em até 24 horas. Normalmente o acesso é liberado em poucos minutos!" }
      },
      {
        "@type": "Question",
        "name": "Posso cancelar quando quiser?",
        "acceptedAnswer": { "@type": "Answer", "text": "Você tem até 7 dias após a contratação para cancelar e receber reembolso integral, conforme o Código de Defesa do Consumidor. Após esse prazo, a assinatura segue até o fim do período contratado." }
      },
      {
        "@type": "Question",
        "name": "O conteúdo é atualizado?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sim! Estamos constantemente adicionando novas formações, materiais e recursos. Você terá acesso a todas as atualizações enquanto for membro." }
      },
      {
        "@type": "Question",
        "name": "Tenho suporte se tiver dúvidas?",
        "acceptedAnswer": { "@type": "Answer", "text": "Com certeza! Além das mentorias semanais, você pode tirar dúvidas na comunidade e tem acesso a suporte prioritário." }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Comunidade de E-commerce"
        description="Acesse formações completas, mentorias exclusivas e uma rede de empreendedores prontos para acelerar seus resultados no e-commerce."
        canonical="/"
        jsonLd={landingJsonLd}
      />
      <SEOHead jsonLd={faqJsonLd} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={isDarkMode ? logoMapDark : logoMapLight} 
              alt="MAP Acelera - Comunidade de Empreendedores" 
              className="h-8 w-auto"
              width={120}
              height={32}
              fetchPriority="high"
              decoding="async"
            />

            <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
              <Flame className="h-3 w-3 text-primary" />
            </div>
          </div>
          <Button variant="outline" onClick={handleLogin} className="rounded-full">
            Já sou membro
          </Button>
        </div>
      </header>

      <main>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-6">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">A comunidade que mais cresce no e-commerce</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Transforme seu negócio com a{" "}
            <span className="text-primary">MAP Acelera</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Acesse formações completas, mentorias exclusivas e uma rede de empreendedores 
            prontos para acelerar seus resultados no e-commerce.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleCTA}
              className="rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
            >
              Quero fazer parte
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-full text-lg px-8 py-6"
            >
              Conhecer mais
            </Button>
          </div>

          <button
            onClick={handleLogin}
            className="mt-8 text-lg font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
          >
            Já sou membro
          </button>

        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa para{" "}
              <span className="text-primary">escalar seu negócio</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa com todas as ferramentas e conhecimentos para você 
              dominar o e-commerce.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              O que nossos <span className="text-primary">membros</span> dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Invista no seu <span className="text-primary">futuro</span>
            </h2>
            <p className="text-muted-foreground">
              Escolha o plano ideal para o momento do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                id: "basic",
                name: "Basic",
                price: "197",
                badge: "ESSENCIAL",
                highlight: false,
                features: [
                  "Acesso completo à plataforma",
                  "Trilha de Crescimento",
                  "Formações e conteúdos exclusivos",
                  "Networking com a comunidade",
                  "Certificados de conclusão",
                ],
              },
              {
                id: "pro",
                name: "Pro",
                price: "497",
                badge: "MAIS POPULAR",
                highlight: true,
                features: [
                  "Tudo do Basic +",
                  "Mentorias em grupo semanais",
                  "Webinars exclusivos com especialistas",
                  "Grupo VIP no WhatsApp",
                  "VIP na próxima edição do MAP Experience",
                  "Evento presencial exclusivo 'MAP.IA'",
                  "Evento presencial exclusivo 'Precifica MAP'",
                ],
              },
              {
                id: "business",
                name: "Business",
                price: "997",
                badge: "PREMIUM",
                highlight: false,
                features: [
                  "Tudo do Pro +",
                  "2 mentorias individuais focadas no seu negócio",
                  "1 mentoria por mês com CEOs da MAP (João ou Pedro)",
                  "Prioridade em todas as ações da comunidade",
                ],
              },
            ].map((plan) => (
              <div key={plan.id} className="flex flex-col">
                <Card
                  className={`relative overflow-hidden transition-all duration-300 flex flex-col flex-1 ${
                    plan.highlight
                      ? "border-primary shadow-lg shadow-primary/10 hover:scale-[1.02]"
                      : "border-border/50 bg-card/50 hover:scale-[1.02]"
                  }`}
                >
                  <div className="px-6 pt-6 pb-2">
                    <span
                      className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        plan.highlight
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <CardContent className="p-6 pt-4 flex flex-col flex-1">
                    <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className={`text-5xl font-bold ${plan.highlight ? "text-primary" : ""}`}>
                          {plan.price}
                        </span>
                        <span className="text-sm text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Assinatura anual</p>
                    </div>

                    <div className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      onClick={handleCTA}
                      className={`w-full rounded-full gap-2 text-base py-6 ${
                        plan.highlight
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      APLICAR PARA O {plan.name.toUpperCase()}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Pagamento seguro via Asaas · 7 dias para cancelamento após a compra · Acesso imediato após confirmação
          </p>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perguntas <span className="text-primary">frequentes</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "Como recebo acesso após o pagamento?",
                answer: "Após a confirmação do pagamento, você receberá um email com suas credenciais de acesso em até 24 horas. Normalmente o acesso é liberado em poucos minutos!"
              },
              {
                question: "Posso cancelar quando quiser?",
                answer: "Você tem até 7 dias após a contratação para cancelar e receber reembolso integral, conforme o Código de Defesa do Consumidor. Após esse prazo, a assinatura segue válida até o fim do período contratado."
              },
              {
                question: "O conteúdo é atualizado?",
                answer: "Sim! Estamos constantemente adicionando novas formações, materiais e recursos. Você terá acesso a todas as atualizações enquanto for membro."
              },
              {
                question: "Tenho suporte se tiver dúvidas?",
                answer: "Com certeza! Além das mentorias semanais, você pode tirar dúvidas na comunidade e tem acesso a suporte prioritário."
              }
            ].map((faq, index) => (
              <Card key={index} className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary/5 border-y border-primary/20">
        <div className="container mx-auto max-w-3xl text-center">
          <Flame className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Junte-se a centenas de empreendedores que já estão acelerando seus resultados 
            com o MAP Acelera.
          </p>
          <Button 
            size="lg" 
            onClick={handleCTA}
            className="rounded-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6"
          >
            QUERO FAZER PARTE
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img 
              src={isDarkMode ? logoMapDark : logoMapLight} 
              alt="MAP Acelera - Comunidade de Empreendedores" 
              className="h-6 w-auto"
            />
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <nav aria-label="Links institucionais" className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <a href="/" className="text-muted-foreground hover:text-primary transition-colors">Início</a>
            <a href="/planos" className="text-muted-foreground hover:text-primary transition-colors">Planos</a>
            <a href="/validar-certificado" className="text-muted-foreground hover:text-primary transition-colors">Validar Certificado</a>
            <a href="/auth" className="text-muted-foreground hover:text-primary transition-colors">Entrar</a>
            <a href="/privacidade" className="text-muted-foreground hover:text-primary transition-colors">Privacidade</a>
            <a href="/excluir-conta" className="text-muted-foreground hover:text-primary transition-colors">Excluir conta</a>
          </nav>
          <p className="text-sm text-muted-foreground">
            © 2024 MAP Acelera. Todos os direitos reservados.
          </p>

        </div>
      </footer>
    </div>
  );
}
