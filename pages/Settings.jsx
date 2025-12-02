import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Shield,
  Trash2,
  LogOut,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from '../components/i18n/TranslationContext';

export default function Settings() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState('en');
  const [downloading, setDownloading] = useState(false);
  const [weights, setWeights] = useState({
    industry: 30,
    role: 25,
    location: 15,
    company: 15,
    skills: 15
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.UserSettings.filter({ created_by: user.email });
      return list[0];
    },
  });

  useEffect(() => {
    if (settings?.notification_frequency) {
      setEmailNotifications(settings.notification_frequency !== 'off');
    }
    if (settings?.relevance_weights) {
      setWeights(settings.relevance_weights);
    }
    if (user?.language) {
      setLanguage(user.language);
    }
  }, [settings, user]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settings) {
        return base44.entities.UserSettings.update(settings.id, data);
      } else {
        return base44.entities.UserSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
    },
  });

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleSaveNotifications = async () => {
    await updateSettingsMutation.mutateAsync({
      notification_frequency: emailNotifications ? 'daily' : 'off'
    });
    toast.success(t('notificationsSaved'));
  };

  const handleSaveWeights = async () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total === 0) {
        toast.error("Total weight cannot be zero");
        return;
    }
    // Normalize to 100 if needed, or just save raw values
    // Let's just save raw values but warn if they look weird? 
    // Actually, let's just save them. The algorithm will handle scaling if needed, 
    // or we just assume they are relative weights.
    // But for UI niceness, maybe we show the total.
    
    await updateSettingsMutation.mutateAsync({
      relevance_weights: weights
    });
    toast.success(t('weightsSaved'));
  };

  const handleChangeLanguage = async (value) => {
    setLanguage(value);
    await base44.auth.updateMe({ language: value });
    i18n.changeLanguage(value);
    toast.success(t('languageUpdated'));
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const [contacts, events, interactions, applications, resumes, sessions] = await Promise.all([
        base44.entities.Contact.list(),
        base44.entities.Event.list(),
        base44.entities.Interaction.list(),
        base44.entities.JobApplication.list(),
        base44.entities.Resume.list(),
        base44.entities.CareerCoachSession.list(),
      ]);

      const userData = {
        user: {
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          exported_at: new Date().toISOString()
        },
        contacts,
        events,
        interactions,
        job_applications: applications,
        resumes,
        career_sessions: sessions,
        settings
      };

      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `propelme-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('dataDownloaded'));
    } catch (error) {
      toast.error('Error downloading data'); // Keep hardcoded or add generic error key
      console.error(error);
    }
    setDownloading(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
          <SettingsIcon className="w-9 h-9" />
          {t('title')}
        </h1>
        <p className="text-slate-600 mt-1">
          {t('subtitle')}
        </p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('accountInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('fullName')}</Label>
            <Input value={user?.full_name || ''} disabled className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label>{t('emailAddress')}</Label>
            <Input value={user?.email || ''} disabled className="bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label>{t('accountRole')}</Label>
            <Input value={user?.role || 'user'} disabled className="bg-slate-50 capitalize" />
          </div>
          <p className="text-xs text-slate-500 pt-2">
            {t('updateInfo')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{t('emailNotifications')}</p>
              <p className="text-sm text-slate-600">{t('emailNotificationsDesc')}</p>
            </div>
            <Switch 
              checked={emailNotifications} 
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium text-slate-900">{t('pushNotifications')}</p>
              <p className="text-sm text-slate-600">{t('pushNotificationsDesc')}</p>
            </div>
            <Switch 
              checked={pushNotifications} 
              onCheckedChange={setPushNotifications}
            />
          </div>
          <Button onClick={handleSaveNotifications} className="w-full">
            {t('savePreferences')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('relevanceWeights')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-slate-600">
            {/* Simplify this text or add key for it. Using a generic description for now as per translation file */}
            Adjust how much each factor contributes to the contact relevance score.
            Total: <span className={Object.values(weights).reduce((a, b) => a + b, 0) !== 100 ? "text-amber-600 font-bold" : "font-bold"}>{Object.values(weights).reduce((a, b) => a + b, 0)}%</span>
          </p>
          
          {['industry', 'role', 'location', 'company', 'skills'].map((factor) => (
            <div key={factor} className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="capitalize">{t(`dashboard:${factor}`) || factor}</Label>
                <span className="text-sm font-medium text-slate-700">{weights[factor]}%</span>
              </div>
              <Slider 
                value={[weights[factor]]} 
                max={100} 
                step={5}
                onValueChange={(vals) => setWeights(prev => ({ ...prev, [factor]: vals[0] }))} 
              />
            </div>
          ))}

          <Button onClick={handleSaveWeights} className="w-full">
            {t('saveWeights')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('languageRegion')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('language')}</Label>
            <Select value={language} onValueChange={handleChangeLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('privacyData')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleDownloadData}
            disabled={downloading}
            variant="outline" 
            className="w-full justify-start"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('preparingDownload')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('downloadData')}
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500">
            {t('downloadDescription')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            {t('dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="w-full border-slate-300 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('logOut')}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full border-red-300 text-red-700 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('deleteAccount')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteAccountTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteAccountDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => toast.info(t('deleteAccountInfo'))}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {tCommon('ok')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}