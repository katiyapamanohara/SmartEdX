"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import OnboardGuard from '@/components/auth/OnboardGuard';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/input/InputField';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { countries, type Country } from '@/data/countries';


const pageVariants = {
  initial: { 
    opacity: 1
  },
  in: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  out: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

const useCaseVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 20
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const
    }
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      duration: 0.2,
      ease: "easeInOut" as const
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
};

const employeeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1000 employees" },
  { value: "1000+", label: "1000+ employees" }
];


const referralOptions = [
  { value: "google-search", label: "Google Search" },
  { value: "social-media", label: "Social Media" },
  { value: "friend-colleague", label: "Friend or Colleague" },
  { value: "blog-article", label: "Blog or Article" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "online-ad", label: "Online Advertisement" },
  { value: "conference-event", label: "Conference or Event" },
  { value: "email-newsletter", label: "Email Newsletter" },
  { value: "other", label: "Other" }
];

const useCases = [
  'Marketing',
  'Research', 
  'Sales',
  'Customer Support',
  'Analytics',
  'Engineering',
  'Product Management',
  'Other'
];

const ProgressBar = React.memo(({ currentStep, onBack, onSkip }: { 
  currentStep: number; 
  onBack: () => void; 
  onSkip: () => void; 
}) => (
  <div className="fixed top-0 left-0 right-0 flex justify-between items-center w-full h-[120px] sm:h-[120px] px-3 sm:px-4 z-10">
    <AnimatePresence>
      {currentStep > 1 ? (
        <motion.button
          key="back-button"
          onClick={onBack}
          className="flex items-center text-white/70 hover:text-white transition-colors duration-300 w-[50px] sm:w-[80px] justify-start text-[12px] sm:text-[14px]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="mr-1 sm:mr-2"
            whileHover={{ x: -2 }}
            transition={{ duration: 0.2 }}
          >
            <path d="m15 18-6-6 6-6"/>
          </motion.svg>
          <span className="hidden sm:inline">Back</span>
        </motion.button>
      ) : (
        <div className="w-[60px] sm:w-[80px]"></div>
      )}
    </AnimatePresence>
    
    <div className="flex space-x-2 sm:space-x-3 flex-1 justify-center items-center relative">
      <div className="absolute inset-0 flex space-x-2 sm:space-x-3 justify-center items-center">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={`bg-${step}`}
            className="rounded-sm bg-[#ffffff1a] transition-all duration-500 ease-out"
            style={{
              width: step === currentStep ? 48 : 32,
              height: step === currentStep ? 12 : 8,
            }}
          />
        ))}
      </div>
      
      {[1, 2, 3, 4, 5].map((step) => (
        <motion.div
          key={step}
          className="relative rounded-sm overflow-hidden"
          initial={{
            width: 32,
            height: 8,
            scale: 1,
          }}
          animate={{
            width: step === currentStep ? 48 : 32,
            height: step === currentStep ? 12 : 8,
            scale: step === currentStep ? 1.05 : 1,
          }}
          transition={{
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
            delay: step === currentStep ? 0 : step < currentStep ? 0.1 * (currentStep - step) : 0
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-sm"
            initial={{ 
              backgroundColor: step < currentStep ? '#ffffff80' : step === currentStep ? '#ffffff' : '#ffffff4d'
            }}
            animate={{ 
              backgroundColor: step < currentStep ? '#ffffff80' : step === currentStep ? '#ffffff' : '#ffffff4d'
            }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
          />
          
          {step === currentStep && (
            <motion.div
              className="absolute inset-0 rounded-sm"
              initial={{ 
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                x: '-100%'
              }}
              animate={{ 
                x: '200%'
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut" as const,
                delay: 0.3
              }}
            />
          )}
          
          {step === currentStep && (
            <motion.div
              className="absolute inset-0 rounded-sm bg-white"
              animate={{ 
                opacity: [0.8, 1, 0.8],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut" as const
              }}
            />
          )}
          

          
          {step === currentStep && (
            <motion.div
              className="absolute inset-0 rounded-sm"
              style={{
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)'
              }}
              animate={{ 
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut" as const
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
    
    <AnimatePresence>
      {(currentStep === 3) ? (
        <motion.button
          key="skip-button"
          onClick={onSkip}
          className="text-white/70 hover:text-white transition-colors duration-300 text-[12px] sm:text-[15px] w-[50px] sm:w-[80px] text-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            whileHover={{ x: 2 }}
            transition={{ duration: 0.2 }}
          >
            Skip
          </motion.span>
        </motion.button>
      ) : (
        <div className="w-[50px] sm:w-[80px]"></div>
      )}
    </AnimatePresence>
  </div>
));

ProgressBar.displayName = 'ProgressBar';

const Logo = React.memo(() => (
  <div className="fixed top-[140px] sm:top-[160px] left-0 right-0 flex items-center justify-center h-[60px] z-10">
    <Image
      src="/images/logo/articom-dark-logo.svg"
      alt="Articom Logo"
      width={200}
      height={40}
    />
  </div>
));

Logo.displayName = 'Logo';

const OnboardingSelect = React.memo(({ value, onChange, options, placeholder, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  className?: string;
}) => (
  <motion.div 
    className={`relative ${className}`}
    variants={itemVariants}
    initial="hidden"
    animate="visible"
  >
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white rounded-[16px] px-4 sm:px-6 py-4 sm:py-5 text-[#555] shadow-lg outline-none focus:ring-2 focus:ring-white/[0.2] text-[14px] sm:text-[16px] border-none h-[50px] sm:h-[60px] appearance-none cursor-pointer"
      style={{ 
        color: value ? '#555' : '#a0a0a0',
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.75rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em'
      }}
    >
      <option value="" disabled style={{ color: '#a0a0a0' }}>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} style={{ color: '#555', backgroundColor: 'white' }}>
          {option.label}
        </option>
      ))}
    </select>
  </motion.div>
));

OnboardingSelect.displayName = 'OnboardingSelect';

const CountrySelector = React.memo(({ selectedCountry, onCountryChange, countryCodeInput, onCountryCodeChange, phoneNumber, onPhoneNumberChange }: {
  selectedCountry: Country | null;
  onCountryChange: (country: Country) => void;
  countryCodeInput: string;
  onCountryCodeChange: (code: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (phone: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validatePhoneNumber = (phone: string, countryCode: string) => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    if (countryCode === '+1') {
      if (cleanPhone.length !== 10) {
        return 'US/Canada phone numbers should be 10 digits';
      }
    } else if (countryCode === '+44') {
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return 'UK phone numbers should be 10-11 digits';
      }
    } else {
      if (cleanPhone.length < 7 || cleanPhone.length > 15) {
        return 'Phone number should be 7-15 digits';
      }
    }

    if (countryCode !== '+1' && cleanPhone.startsWith('0')) {
      return 'Phone number should not start with 0';
    }

    return '';
  };

  const formatPhoneNumber = (value: string, countryCode: string) => {

    const cleanValue = value.replace(/\D/g, '');
    
    if (countryCode === '+1') { 
      if (cleanValue.length <= 3) {
        return cleanValue;
      } else if (cleanValue.length <= 6) {
        return `(${cleanValue.slice(0, 3)}) ${cleanValue.slice(3)}`;
      } else {
        return `(${cleanValue.slice(0, 3)}) ${cleanValue.slice(3, 6)}-${cleanValue.slice(6, 10)}`;
      }
    } else if (countryCode === '+44') { 
      if (cleanValue.length <= 4) {
        return cleanValue;
      } else if (cleanValue.length <= 7) {
        return `${cleanValue.slice(0, 4)} ${cleanValue.slice(4)}`;
      } else {
        return `${cleanValue.slice(0, 4)} ${cleanValue.slice(4, 7)} ${cleanValue.slice(7, 11)}`;
      }
    } else {
      return cleanValue.replace(/(\d{3,4})(?=\d)/g, '$1 ');
    }
  };

  const filteredCountries = useMemo(() => {
    let result = countries;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = countries.filter(country => 
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.dialCode.includes(query)
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery]);

  const handleCountryCodeChange = (value: string) => {
    const cleanValue = value.replace(/[^\d+]/g, '');
    onCountryCodeChange(cleanValue);
    
    if (cleanValue.length > 1) {
      const matchingCountry = countries.find(country => 
        country.dialCode === cleanValue
      );
      if (matchingCountry && matchingCountry !== selectedCountry) {
        onCountryChange(matchingCountry);
      }
    }
    
    setSearchQuery(cleanValue);
    setIsOpen(cleanValue.length > 0);
  };

  const handleCountrySelect = (country: Country) => {
    onCountryChange(country);
    onCountryCodeChange(country.dialCode);
    setIsOpen(false);
    setSearchQuery('');
    
    if (phoneNumber) {
      const error = validatePhoneNumber(phoneNumber, country.dialCode);
      setPhoneError(error);
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    const formatted = formatPhoneNumber(value, countryCodeInput);
    onPhoneNumberChange(formatted);
    
    const error = validatePhoneNumber(formatted, countryCodeInput);
    setPhoneError(error);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`flex items-center bg-white rounded-[16px] shadow-lg overflow-hidden ${phoneError ? 'ring-2 ring-red-300' : ''}`}>
        <div className="flex items-center px-2 sm:px-3 max-w-[80px] sm:max-w-[80px]">
          <input
            type="text"
            placeholder="+1"
            value={countryCodeInput}
            onChange={(e) => handleCountryCodeChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="bg-transparent border-none outline-none text-[#555] font-medium text-xl sm:text-xl p-4"
            maxLength={12}
          />
        </div>
        
        {selectedCountry && (
          <div className="flex items-center px-2">
            <span className="text-2xl ">{selectedCountry.flag}</span>
          </div>
        )}
        
        <span className="text-[#a0a0a0] text-2xl sm:text-3xl font-light ml-2  leading-none relative top-[-1px] sm:top-[-2px]">|</span>

        <input
          type="tel"
          placeholder="(555) 000-0000"
          value={phoneNumber}
          onChange={(e) => handlePhoneNumberChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[#555] placeholder-[#a0a0a0] text-xl sm:text-xl ml-2 sm:ml-3 px-3 sm:px-4 py-4 sm:py-5"
        />
      </div>

      <AnimatePresence>
        {phoneError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 text-white text-bold px-2"
          >
            {phoneError}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && filteredCountries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
            className="absolute top-full left-0 right-0 bg-white rounded-[12px] shadow-xl border border-gray-100 mt-2 z-50 max-h-[300px] overflow-y-auto"
          >
            {filteredCountries.map((country: Country) => (
              <div
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-b border-gray-50 last:border-b-0"
              >
                <span className="text-xl mr-3">{country.flag}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#555] font-medium text-[14px]">{country.name}</span>
                    <span className="text-[#666] text-[13px] font-medium">{country.dialCode}</span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CountrySelector.displayName = 'CountrySelector';

const ActionButton = React.memo(({ children, onClick, disabled = false }: { 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean; 
}) => (
  <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-4 sm:pb-8 z-10 mt-6 sm:mt-8">
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: "easeInOut" as const }}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        size="md"
        variant="primary"
        className="!bg-white !text-[#6A0DAD] font-semibold px-8 sm:px-12 py-4 sm:py-5 rounded-[16px] text-[16px] sm:text-[18px] hover:!bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed w-[180px] sm:w-[200px]"
      >
        {children}
      </Button>
    </motion.div>
  </div>
));

ActionButton.displayName = 'ActionButton';

const OnboardingBackground = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="h-screen flex flex-col overflow-hidden relative">
    <motion.div 
      className="absolute inset-0 opacity-100"
      animate={{
        background: [
          'linear-gradient(45deg, #524ED2, #6B5CE7, #7B68EE, #524ED2)',
          'linear-gradient(135deg, #6B5CE7, #7B68EE, #9370DB, #6B5CE7)',
          'linear-gradient(225deg, #7B68EE, #9370DB, #8A7FFF, #7B68EE)',
          'linear-gradient(315deg, #524ED2, #6B5CE7, #7B68EE, #524ED2)',
          'linear-gradient(45deg, #524ED2, #6B5CE7, #7B68EE, #524ED2)'
        ]
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "linear" as const,
        repeatType: "loop"
      }}
    />
    
    <motion.div 
      className="absolute top-10 left-10 w-32 h-32 rounded-full opacity-20"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)'
      }}
      animate={{
        x: [0, 100, 0],
        y: [0, -50, 0],
        scale: [1, 1.2, 1]
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut" as const
      }}
    />
    
    <motion.div 
      className="absolute top-1/2 right-10 w-24 h-24 rounded-full opacity-15"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)'
      }}
      animate={{
        x: [0, -80, 0],
        y: [0, 60, 0],
        scale: [1, 0.8, 1]
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: 2
      }}
    />
    
    <motion.div 
      className="absolute bottom-20 left-1/3 w-20 h-20 rounded-full opacity-25"
      style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)'
      }}
      animate={{
        x: [0, 60, 0],
        y: [0, -40, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{
        duration: 14,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: 4
      }}
    />
    
    {/* Subtle Mesh Gradient Overlay */}
    <motion.div 
      className="absolute inset-0 opacity-30"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 70%, rgba(255,255,255,0.08) 0%, transparent 50%)
        `
      }}
      animate={{
        opacity: [0.2, 0.4, 0.2]
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut" as const
      }}
    />
    
    <div className="relative z-10 h-full flex flex-col">
      {children}
    </div>
  </div>
));

OnboardingBackground.displayName = 'OnboardingBackground';

const ArticomOnboarding = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCodeInput, setCountryCodeInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  
  const handleUseCaseToggle = (useCase: string) => {
    setSelectedUseCases(prev => 
      prev.includes(useCase) 
        ? prev.filter(uc => uc !== useCase)
        : [...prev, useCase]
    );
  };

  const isPhoneNumberValid = () => {
    if (!phoneNumber.trim() || !countryCodeInput.trim()) {
      return false;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (countryCodeInput !== '+1' && cleanPhone.startsWith('0')) {
      return false;
    }
    
    if (countryCodeInput === '+1') {
      return cleanPhone.length === 10;
    } else if (countryCodeInput === '+44') {
      return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    } else {
      return cleanPhone.length >= 7 && cleanPhone.length <= 15;
    }
  };

  const isStep3Valid = () => {
    return companyName.trim() !== '' && employeeCount.trim() !== '';
  };

  const handleNext = async () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 5) {
      setIsSubmitting(true);
      setCurrentStep(6);
      
      try {
        const onboardingData = {
          auth: {},
          authMeta: {
            phoneNumber: `${countryCodeInput}${phoneNumber}`,
            country: selectedCountry?.name || '',
            companyName: companyName,
            numberOfEmployees: employeeCount,
            hearAboutUs: referralSource,
            primaryUseCase: selectedUseCases
          }
        };

        await authService.submitOnboardingData(onboardingData);

        
        setTimeout(() => {
          router.push('/dashboard'); // Redirect to dashboard after creation
        }, 3000);
      } catch (error) {
        console.error('Failed to submit onboarding data:', error);
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 3) {
      if (!companyName || companyName.trim() === '') {
        setCompanyName('skipped');
      }
      if (!employeeCount || employeeCount.trim() === '') {
        setEmployeeCount('skipped');
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Step 1: Welcome
  if (currentStep === 1) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-1"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <ProgressBar currentStep={currentStep} onBack={handleBack} onSkip={handleSkip} />
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4" 
            style={{ paddingTop: '180px', paddingBottom: '120px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-md">
              <motion.h1 
                className="text-4xl sm:text-5xl font-bold text-white leading-[50px] sm:leading-[60px] mb-6"
                variants={itemVariants}
              >
                Set up your profile
              </motion.h1>
              
              <motion.p 
                className="text-white/[0.6] text-[18px] mb-12 leading-[30px] px-4"
                variants={itemVariants}
              >
                We&apos;ll ask a few quick questions to tailor your AI agent just for your business.
              </motion.p>
            </div>
          </motion.div>
          
          <ActionButton onClick={handleNext}>
            Get Start!
          </ActionButton>
        </motion.div>
      </OnboardingBackground>
    );
  }

  // Step 2: Phone Number 
  if (currentStep === 2) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-2"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <ProgressBar currentStep={currentStep} onBack={handleBack} onSkip={handleSkip} />
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4" 
            style={{ paddingTop: '180px', paddingBottom: '120px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-md w-full">
              <motion.h1 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
                variants={itemVariants}
              >
                First things first – your phone number.
              </motion.h1>
              
              <motion.p 
                className="text-white/[0.6] text-[15px] mb-8"
                variants={itemVariants}
              >
                Enter your phone number (with auto country code detection)
              </motion.p>

              <motion.div 
                className="mb-6"
                variants={itemVariants}
              >
                <CountrySelector
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                  countryCodeInput={countryCodeInput}
                  onCountryCodeChange={setCountryCodeInput}
                  phoneNumber={phoneNumber}
                  onPhoneNumberChange={setPhoneNumber}
                />
              </motion.div>

              <motion.p 
                className="text-white/[0.6] text-[13px]"
                variants={itemVariants}
              >
                For secure access and quick support when you need it.
              </motion.p>
            </div>
          </motion.div>
          
          <ActionButton onClick={handleNext} disabled={!isPhoneNumberValid()}>
            Next
          </ActionButton>
        </motion.div>
      </OnboardingBackground>
    );
  }

  // Step 3: Company Info
  if (currentStep === 3) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-3"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <ProgressBar currentStep={currentStep} onBack={handleBack} onSkip={handleSkip} />
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4" 
            style={{ paddingTop: '180px', paddingBottom: '120px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-md w-full">
              <motion.h1 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[40px] sm:leading-[50px] mb-4"
                variants={itemVariants}
              >
                Tell us about your company
              </motion.h1>
              
              <motion.p 
                className="text-white/[0.6] text-[15px] mb-8"
                variants={itemVariants}
              >
                Both fields are required to continue, or you can skip this step entirely
              </motion.p>

              <motion.div 
                className="flex flex-col space-y-4 mb-6"
                variants={containerVariants}
              >
                <motion.div variants={itemVariants}>
                  <Input
                    type="text"
                    placeholder="Enter your company name"
                    defaultValue={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="!bg-white !rounded-[16px] !px-4 sm:!px-6 !py-4 sm:!py-5 !text-[#555] !placeholder-[#a0a0a0] !shadow-lg !outline-none focus:!ring-2 focus:!ring-white/[0.2] !text-[14px] sm:!text-[16px] !border-none !h-[50px] sm:!h-[60px]"
                  />
                </motion.div>
                <OnboardingSelect
                  value={employeeCount}
                  onChange={setEmployeeCount}
                  options={employeeOptions}
                  placeholder="Select number of employees"
                />
              </motion.div>

              <motion.p 
                className="text-white/[0.6] text-[13px]"
                variants={itemVariants}
              >
                We&apos;ll customize the experience based on your scale.
              </motion.p>
            </div>
          </motion.div>
          
          <ActionButton onClick={handleNext} disabled={!isStep3Valid()}>
            Next
          </ActionButton>
        </motion.div>
      </OnboardingBackground>
    );
  }

  // Step 4: Referral Source
  if (currentStep === 4) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-4"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <ProgressBar currentStep={currentStep} onBack={handleBack} onSkip={handleSkip} />
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4" 
            style={{ paddingTop: '180px', paddingBottom: '120px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-md w-full">
              <motion.h1 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[40px] sm:leading-[50px] mb-6"
                variants={itemVariants}
              >
                Where did you hear about us?
              </motion.h1>
              
              <motion.p 
                className="text-white/[0.6] text-[15px] mb-8"
                variants={itemVariants}
              >
                Help us understand how you discovered Articom
              </motion.p>

              <motion.div 
                className="mb-6"
                variants={itemVariants}
              >
                <OnboardingSelect
                  value={referralSource}
                  onChange={setReferralSource}
                  options={referralOptions}
                  placeholder="Select an option"
                />
              </motion.div>

              <motion.p 
                className="text-white/[0.6] text-[13px]"
                variants={itemVariants}
              >
                This helps us improve our outreach and serve you better.
              </motion.p>
            </div>
          </motion.div>
          
          <ActionButton onClick={handleNext} disabled={!referralSource}>
            Next
          </ActionButton>
        </motion.div>
      </OnboardingBackground>
    );
  }

  // Step 5: Use Cases
  if (currentStep === 5) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-5"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <ProgressBar currentStep={currentStep} onBack={handleBack} onSkip={handleSkip} />
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4" 
            style={{ paddingTop: '180px', paddingBottom: '120px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-4xl w-full">
              <motion.h1 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[40px] sm:leading-[50px] mb-6 sm:mb-8"
                variants={itemVariants}
              >
                Choose your primary use cases
              </motion.h1>

              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-3 gap-y-2 sm:gap-y-3 mb-4 sm:mb-6 px-2 sm:px-0"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {useCases.map((useCase, index) => (
                  <motion.div
                    key={useCase}
                    variants={useCaseVariants}
                    whileHover="hover"
                    whileTap="tap"
                    custom={index}
                  >
                    <div
                      onClick={() => handleUseCaseToggle(useCase)}
                      className={`px-2 sm:px-3 py-2 sm:py-3 rounded-full font-medium transition-all duration-200 text-[11px] sm:text-[13px] md:text-[14px] shadow-md hover:shadow-lg w-full cursor-pointer text-center ${
                        selectedUseCases.includes(useCase)
                          ? 'bg-[#4a4aff] text-white border border-white shadow-lg'
                          : 'bg-white text-[#6A0DAD] hover:bg-gray-50'
                      }`}
                    >
                      {useCase}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <motion.p 
                className="text-white/[0.6] text-[15px]"
                variants={itemVariants}
              >
                Let us shape your assistant&apos;s purpose from the start.
              </motion.p>
            </div>
          </motion.div>
          
          <ActionButton onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Finish'}
          </ActionButton>
        </motion.div>
      </OnboardingBackground>
    );
  }

  // Step 6: Creating Profile
  if (currentStep === 6) {
    return (
      <OnboardingBackground>
        <motion.div 
          key="step-6"
          className="h-full flex flex-col"
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          <Logo />
          
          <motion.div 
            className="flex-1 flex items-center justify-center px-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center max-w-md">
              <motion.h1 
                className="text-5xl font-bold text-white leading-[60px] mb-4"
                variants={itemVariants}
              >
                Creating your profile
              </motion.h1>
              
              <motion.p 
                className="text-white/[0.6] text-[18px] mb-12"
                variants={itemVariants}
              >
                Adding a pinch of magic. This won&apos;t take long
              </motion.p>

              <motion.div 
                className="flex items-center justify-center"
                variants={itemVariants}
              >
                <motion.div 
                  className="relative w-16 h-16"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut" as const
                  }}
                >
                  <div className="absolute inset-0 rounded-full border-4 border-white/[0.2] border-t-white animate-spin"></div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </OnboardingBackground>
    );
  }
};

const OnboardingPage = () => {
  return (
    <OnboardGuard>
      <AnimatePresence mode="wait">
        <ArticomOnboarding />
      </AnimatePresence>
    </OnboardGuard>
  );
};

export default OnboardingPage;