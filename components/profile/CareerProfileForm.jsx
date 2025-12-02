import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '../i18n/TranslationContext';
import TagInput from './TagInput';

// Industry suggestions
const INDUSTRY_SUGGESTIONS = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Hospitality', 'Real Estate', 'Media', 'Entertainment',
  'Consulting', 'Legal', 'Marketing', 'Telecommunications', 'Energy',
  'Automotive', 'Aerospace', 'Biotechnology', 'Pharmaceuticals', 'Insurance',
  'Banking', 'E-commerce', 'Fashion', 'Food & Beverage', 'Logistics',
  'Construction', 'Agriculture', 'Non-Profit', 'Government', 'Research'
];

const LOCATION_SUGGESTIONS = [
  'Boston, MA', 'New York, NY', 'San Francisco, CA', 'Los Angeles, CA',
  'Chicago, IL', 'Seattle, WA', 'Austin, TX', 'Denver, CO', 'London, UK',
  'Berlin, Germany', 'Paris, France', 'Toronto, Canada', 'Sydney, Australia',
  'Singapore', 'Tokyo, Japan', 'Remote', 'Hybrid'
];

export default function CareerProfileForm({ profile, onSave, saving }) {
  const { t } = useTranslation('profile');
  const [formData, setFormData] = useState({
    dream_roles: profile?.dream_roles || [],
    target_industries: profile?.target_industries || [],
    preferred_departments: profile?.preferred_departments || [],
    preferred_locations: profile?.preferred_locations || [],
    work_eligibility_countries: profile?.work_eligibility_countries || [],
    wishlist_companies: profile?.wishlist_companies || [],
    weekly_networking_capacity: profile?.weekly_networking_capacity || 5,
    target_skills: profile?.target_skills || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>{t('careerProfile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <TagInput
            field="dream_roles"
            label={t('dreamRoles')}
            placeholder="e.g., Product Manager, Head of Product"
            value={formData.dream_roles}
            onChange={(value) => handleFieldChange('dream_roles', value)}
          />

          <TagInput
            field="target_industries"
            label={t('targetIndustries')}
            placeholder="e.g., Healthcare, Technology, Finance"
            suggestions={INDUSTRY_SUGGESTIONS}
            value={formData.target_industries}
            onChange={(value) => handleFieldChange('target_industries', value)}
          />

          <TagInput
            field="preferred_departments"
            label={t('preferredDepartments')}
            placeholder="e.g., Product, Strategy, Operations"
            value={formData.preferred_departments}
            onChange={(value) => handleFieldChange('preferred_departments', value)}
          />

          <TagInput
            field="preferred_locations"
            label={t('preferredLocations')}
            placeholder="e.g., Boston MA, London UK, Remote"
            suggestions={LOCATION_SUGGESTIONS}
            value={formData.preferred_locations}
            onChange={(value) => handleFieldChange('preferred_locations', value)}
          />

          <TagInput
            field="work_eligibility_countries"
            label={t('workEligibility')}
            placeholder="e.g., US, UK, EU"
            value={formData.work_eligibility_countries}
            onChange={(value) => handleFieldChange('work_eligibility_countries', value)}
          />

          <TagInput
            field="wishlist_companies"
            label={t('wishlistCompanies')}
            placeholder="e.g., Google, Apple, Microsoft"
            value={formData.wishlist_companies}
            onChange={(value) => handleFieldChange('wishlist_companies', value)}
          />

          <TagInput
            field="target_skills"
            label="Target Skills & Keywords"
            placeholder="e.g., Leadership, AI, Mentoring"
            value={formData.target_skills}
            onChange={(value) => handleFieldChange('target_skills', value)}
          />

          <div className="space-y-2">
            <Label>{t('weeklyNetworkingTarget')}</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={formData.weekly_networking_capacity}
              onChange={(e) => setFormData({ ...formData, weekly_networking_capacity: parseInt(e.target.value) })}
            />
            <p className="text-xs text-slate-500">Number of contacts to reach out per week</p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t('saving') : t('saveProfile')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}