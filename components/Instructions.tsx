import React from 'react';
import { useTranslation } from '../LanguageContext';

export const Instructions: React.FC = () => {
    const { t } = useTranslation();

    const Step: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div>
            <h4 className="text-lg font-semibold text-teal-400">{title}</h4>
            <p className="mt-1 text-sm text-gray-400">{children}</p>
        </div>
    );

    return (
        <div className="mt-8 bg-gray-800/50 p-6 rounded-2xl space-y-4 animate-fade-in">
            <h3 className="text-2xl font-bold text-center text-gray-200 mb-6">{t('instructions_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
                <Step title={t('instructions_step1_title')}>
                    {t('instructions_step1_desc')}{' '}
                    <a 
                        href="https://zbgis.skgeodesy.sk/mapka/sk/teren?pos=48.610153,19.396527,9" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-400 hover:text-blue-300 underline"
                    >
                        {t('instructions_zbgis_link')}
                    </a>.
                </Step>
                <Step title={t('instructions_step2_title')}>
                    {t('instructions_step2_desc')}
                </Step>
                <Step title={t('instructions_step3_title')}>
                    {t('instructions_step3_desc')}
                </Step>
                <Step title={t('instructions_step4_title')}>
                    {t('instructions_step4_desc')}
                </Step>
            </div>
        </div>
    );
};
