import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Award,
  Target,
  MapPin,
  Linkedin,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import LinkedInImport from '../components/profile/LinkedInImport';
import CareerProfileForm from '../components/profile/CareerProfileForm';
import { useTranslation } from '../components/i18n/TranslationContext';

export default function Profile() {
  const { t } = useTranslation('profile');
  const queryClient = useQueryClient();
  const [extracting, setExtracting] = useState(false);
  const [savingCareer, setSavingCareer] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['professionalProfile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.ProfessionalProfile.filter({ created_by: user.email });
      return profiles[0];
    },
  });

  const { data: careerProfile } = useQuery({
    queryKey: ['userCareerProfile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserCareerProfile.filter({ created_by: user.email });
      return profiles[0];
    },
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Resume.filter({ created_by: user.email }, '-created_date');
    },
  });

  const createOrUpdateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (profile) {
        return await base44.entities.ProfessionalProfile.update(profile.id, data);
      } else {
        return await base44.entities.ProfessionalProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['professionalProfile']);
      toast.success(t('successUpdate'));
      setExtracting(false);
    },
    onError: (error) => {
      toast.error(t('failedUpdate'));
      console.error(error);
      setExtracting(false);
    }
  });

  const extractFromResume = async (resume) => {
    setExtracting(true);
    try {
      toast.info(`📄 ${t('extractingData')}`, { duration: 3000 });

      const extractionSchema = {
        type: "object",
        properties: {
          full_text: { type: "string" }
        }
      };

      const extractedContent = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: resume.file_url,
        json_schema: extractionSchema
      });

      if (extractedContent.status === 'error' || !extractedContent.output?.full_text) {
        throw new Error('Failed to read resume content. Please ensure it is a valid PDF.'); // Updated error message
      }

      toast.info(`🤖 ${t('analyzing')}`, { duration: 5000 });

      const analysisPrompt = `Extract comprehensive professional profile information from this resume:

${extractedContent.output.full_text}

Extract and structure ALL available information including:
- Full name
- Professional headline/title
- Professional summary
- Complete work history with dates, companies, titles, and key achievements
- Education history
- All technical and soft skills mentioned
- Certifications
- Key strengths and areas of expertise

Be thorough and capture every detail.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            headline: { type: "string" },
            summary: { type: "string" },
            location: { type: "string" },
            work_experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  title: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  current: { type: "boolean" },
                  description: { type: "string" },
                  key_achievements: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  field_of_study: { type: "string" },
                  graduation_year: { type: "string" }
                }
              }
            },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  level: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            certifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  issuer: { type: "string" },
                  date: { type: "string" }
                }
              }
            },
            key_strengths: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await createOrUpdateProfileMutation.mutateAsync({
        ...result,
        target_roles: resume.target_role ? [resume.target_role] : profile?.target_roles || [], // Fallback to existing profile data or empty array
        target_industries: resume.target_industry ? [resume.target_industry] : profile?.target_industries || [], // Fallback to existing profile data or empty array
        last_updated: format(new Date(), 'yyyy-MM-dd')
      });

      toast.success(`✅ ${t('successExtract')}`);
    } catch (error) {
      console.error('Profile extraction error:', error);
      toast.error(error.message || t('failedExtract'));
      setExtracting(false);
    }
  };

  const handleLinkedInImport = async (linkedinData) => {
    try {
      setExtracting(true);
      toast.info(t('importingLinkedin'), { duration: 3000 });

      const skillsFormatted = linkedinData.skills?.map(skill => ({
        name: typeof skill === 'string' ? skill : skill.name,
        level: 'intermediate',
        category: 'general'
      })) || [];

      await createOrUpdateProfileMutation.mutateAsync({
        ...linkedinData,
        skills: skillsFormatted,
        linkedin_url: linkedinData.linkedin_url,
        last_updated: format(new Date(), 'yyyy-MM-dd')
      });
      toast.success(`✅ ${t('successImport')}`);
    } catch (error) {
      console.error('LinkedIn import error:', error);
      toast.error(t('failedImport'));
    } finally {
      // setExtracting(false) is handled by onSuccess/onError of createOrUpdateProfileMutation
    }
  };

  const handleSaveCareerProfile = async (careerData) => {
    setSavingCareer(true);
    try {
      if (careerProfile) {
        await base44.entities.UserCareerProfile.update(careerProfile.id, careerData);
      } else {
        await base44.entities.UserCareerProfile.create(careerData);
      }
      queryClient.invalidateQueries(['userCareerProfile']);
      toast.success(t('successCareerSave'));
    } catch (error) {
      console.error('Error saving career profile:', error);
      toast.error(t('failedCareerSave'));
    }
    setSavingCareer(false);
  };

  if (!profile && resumes.length === 0) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <User className="w-9 h-9" />
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h3 className="text-2xl font-bold text-slate-900 mb-3">{t('getStarted')}</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {t('getStartedDesc')}
            </p>
            <Button 
              onClick={() => window.location.href = '/resume'}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {t('uploadResume')}
            </Button>
          </CardContent>
        </Card>

        <LinkedInImport onProfileExtracted={handleLinkedInImport} />
      </div>
    );
  }

  if (!profile && resumes.length > 0) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <User className="w-9 h-9" />
            Professional Profile
          </h1>
          <p className="text-slate-600 mt-1">
            Extract your profile from an existing resume
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('extractTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t('extractDesc')}
            </p>
            {resumes.map(resume => (
              <div key={resume.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900">{resume.version_name}</p>
                  {resume.target_role && (
                    <p className="text-sm text-slate-600">{resume.target_role}</p>
                  )}
                </div>
                <Button
                  onClick={() => extractFromResume(resume)}
                  disabled={extracting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {extracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t('extracting')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('extractBtn')}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <LinkedInImport onProfileExtracted={handleLinkedInImport} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
            <User className="w-9 h-9" />
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('subtitle')}
          </p>
        </div>
        {resumes.length > 0 && (
          <Button
            onClick={() => extractFromResume(resumes[0])}
            disabled={extracting}
            variant="outline"
          >
            {extracting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('refreshing')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('refreshFromResume')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Header Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile.full_name?.charAt(0) || 'P'}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{profile.full_name}</h2>
              <p className="text-xl text-slate-700 mb-3">{profile.headline}</p>
              {profile.location && (
                <p className="text-slate-600 flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </p>
              )}
              {profile.linkedin_url && (
                <a 
                  href={profile.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm"
                >
                  <Linkedin className="w-4 h-4" />
                  {t('viewLinkedin')}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {profile.summary && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('professionalSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{profile.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Target Roles & Industries */}
      {(profile.target_roles?.length > 0 || profile.target_industries?.length > 0) && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('careerGoals')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.target_roles?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">{t('targetRoles')}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.target_roles.map((role, idx) => (
                    <Badge key={idx} className="bg-purple-100 text-purple-700 border-purple-200">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {profile.target_industries?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">{t('targetIndustries')}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.target_industries.map((industry, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-700 border-blue-200">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Strengths */}
      {profile.key_strengths?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('keyStrengths')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.key_strengths.map((strength, idx) => (
                <Badge key={idx} className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {strength}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Experience */}
      {profile.work_experience?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {t('workExperience')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {profile.work_experience.map((job, idx) => (
              <div key={idx} className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-bold text-lg text-slate-900">{job.title}</h4>
                <p className="text-slate-700 font-medium">{job.company}</p>
                <p className="text-sm text-slate-500 mb-2">
                  {job.start_date} - {job.current ? 'Present' : job.end_date}
                </p>
                {job.description && (
                  <p className="text-slate-600 text-sm mb-2">{job.description}</p>
                )}
                {job.key_achievements?.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    {job.key_achievements.map((achievement, i) => (
                      <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {profile.education?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t('education')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.education.map((edu, idx) => (
              <div key={idx}>
                <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                <p className="text-slate-700">{edu.institution}</p>
                <p className="text-sm text-slate-500">
                  {edu.field_of_study} {edu.graduation_year && `• ${edu.graduation_year}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('skillsExpertise')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {profile.skills.map((skill, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-900">{skill.name}</span>
                  {skill.level && (
                    <Badge variant="outline" className="text-xs">
                      {skill.level}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {profile.certifications?.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('certifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.certifications.map((cert, idx) => (
              <div key={idx} className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{cert.name}</p>
                  <p className="text-sm text-slate-600">{cert.issuer}</p>
                </div>
                {cert.date && (
                  <p className="text-sm text-slate-500">{cert.date}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CareerProfileForm 
        profile={careerProfile} 
        onSave={handleSaveCareerProfile}
        saving={savingCareer}
      />

      <LinkedInImport onProfileExtracted={handleLinkedInImport} />
    </div>
  );
}