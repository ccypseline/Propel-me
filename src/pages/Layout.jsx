
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useTranslation, TranslationProvider } from "@/components/i18n/TranslationContext";
import { 
  LayoutDashboard, 
  Rocket,
  Users, 
  Calendar, 
  Settings, 
  Trophy,
  Sparkles,
  CalendarDays,
  FileText,
  PenTool,
  Newspaper,
  MessageSquare,
  Target,
  Briefcase,
  UserCircle,
  Activity,
  Bot
  } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Contacts",
    url: createPageUrl("Contacts"),
    icon: Users,
  },
  {
    title: "Weekly Plan",
    url: createPageUrl("WeeklyPlan"),
    icon: Calendar,
  },
  {
    title: "AI Messaging",
    url: createPageUrl("AIMessaging"),
    icon: Sparkles,
  },
  {
    title: "Progress",
    url: createPageUrl("Progress"),
    icon: Trophy,
  },
];

const toolsItems = [
  {
    title: "Profile",
    url: createPageUrl("Profile"),
    icon: UserCircle,
  },
  {
    title: "Job Tracker",
    url: createPageUrl("JobTracker"),
    icon: Briefcase,
  },
  {
    title: "Career Coach",
    url: createPageUrl("CareerCoach"),
    icon: Target,
  },
  {
    title: "Events",
    url: createPageUrl("Events"),
    icon: CalendarDays,
  },
  {
    title: "Social Planner",
    url: createPageUrl("SocialPlanner"),
    icon: Newspaper,
  },
  {
    title: "Resume",
    url: createPageUrl("Resume"),
    icon: FileText,
  },
  {
    title: "Interview Practice",
    url: createPageUrl("Interview"),
    icon: MessageSquare,
  },
  {
    title: "Blog Writer",
    url: createPageUrl("BlogWriter"),
    icon: PenTool,
  },
  {
    title: "System Diagnostics",
    url: createPageUrl("SystemDiagnostics"),
    icon: Activity,
  },
  {
    title: "Agent Studio",
    url: createPageUrl("AgentStudio"),
    icon: Bot,
  },
];

function LayoutContent({ children }) {
  const location = useLocation();
  const { t } = useTranslation('nav');
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6916c07a336ea461cb0e42ef/6b8f35ec0_PropelMeLogo.png';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const translatedNavItems = navigationItems.map(item => ({
    ...item,
    translatedTitle: t(item.title.toLowerCase().replace(' ', ''))
  }));

  const translatedToolsItems = toolsItems.map(item => ({
    ...item,
    translatedTitle: t(item.title.toLowerCase().replace(' ', ''))
  }));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <style>{`
          :root {
            --color-primary: 59 130 246; /* Blue-500 */
            --color-success: 5 150 105; /* Emerald */
            --color-warning: 245 158 11; /* Amber */
            --color-danger: 239 68 68; /* Red */
          }
        `}</style>
        
        <Sidebar className="border-r border-slate-200 bg-white/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              {!imageError ? (
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6916c07a336ea461cb0e42ef/6b8f35ec0_PropelMeLogo.png" 
                  alt="PropelMe Logo" 
                  className="w-10 h-10 rounded-xl shadow-lg object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl shadow-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-slate-900 text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">PropelMe</h2>
                <p className="text-xs text-slate-500">Propel your career forward</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 px-3 py-2">
                {t('main')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {translatedNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.translatedTitle}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 px-3 py-2">
                {t('tools')}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {translatedToolsItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-emerald-50 text-emerald-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.translatedTitle}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={`hover:bg-slate-50 transition-all duration-200 rounded-xl ${
                    location.pathname === createPageUrl("Settings") ? 'bg-slate-100' : ''
                  }`}
                >
                  <Link to={createPageUrl("Settings")} className="flex items-center gap-3 px-3 py-2.5">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">{t('settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-sm">P</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">Your Profile</p>
                <p className="text-xs text-slate-500 truncate">Build your network</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">PropelMe</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function Layout({ children }) {
  return (
    <TranslationProvider>
      <LayoutContent>{children}</LayoutContent>
    </TranslationProvider>
  );
}
