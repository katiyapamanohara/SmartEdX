'use client';

import React, { useState, useEffect, JSX } from 'react';
import { useServices } from '@/hooks/useServices';
import { servicesService } from '@/services/servicesService';

// Service card data type (for UI display)
interface ServiceCard {
  id: string;
  serviceID: string;
  name: string;
  description: string;
  icon: JSX.Element;
  color: string;
  isActive?: boolean;
}

interface ServicesProps {
  assistantId: string;
  initialSelectedServices?: string[];
  onServicesChange?: (services: string[]) => void;
}

export const Services: React.FC<ServicesProps> = ({
  assistantId,
  initialSelectedServices = [],
  onServicesChange
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>(initialSelectedServices);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    variant: 'success' | 'info' | 'warning' | 'error';
    title: string;
    description?: string;
  }>({
    variant: 'success',
    title: '',
    description: ''
  });

  const { services: apiServices, loading, error, refetch } = useServices();

  // Function to get default icon for a service
  const getServiceIcon = (serviceName: string, serviceId: string): JSX.Element => {
    const name = serviceName.toLowerCase();
    const id = serviceId.toLowerCase();

    if (name.includes('chat') || id.includes('chat')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2h-5l-5 5v-5z" />
        </svg>
      );
    } else if (name.includes('voice') || id.includes('voice')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    } else if (name.includes('call') || name.includes('phone') || id.includes('call')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    } else if (name.includes('sms') || name.includes('message') || id.includes('sms')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    }

    // Default service icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  // Function to get color for a service
  const getServiceColor = (serviceName: string, serviceId: string): string => {
    const name = serviceName.toLowerCase();
    const id = serviceId.toLowerCase();

    if (name.includes('chat') || id.includes('chat')) return 'indigo';
    if (name.includes('voice') || id.includes('voice')) return 'purple';
    if (name.includes('call') || name.includes('phone') || id.includes('call')) return 'blue';
    if (name.includes('sms') || name.includes('message') || id.includes('sms')) return 'green';

    return 'gray'; // Default color
  };

  // Convert API services to service cards
  const serviceCards: ServiceCard[] = loading ? [] : apiServices.map(service => {

    // Map service ID to a consistent format for sidebar
    let sidebarServiceId = service.id;
    const serviceName = service.name.toLowerCase();

    // Create a consistent service ID format for the sidebar
    if (serviceName.includes('chat')) {
      sidebarServiceId = 'chatbot-service';
    } else if (serviceName.includes('voice')) {
      sidebarServiceId = 'voice-service';
    } else if (serviceName.includes('call') || serviceName.includes('agent')) {
      sidebarServiceId = 'agent-calling-service';
    } else if (serviceName.includes('sms') || serviceName.includes('message')) {
      sidebarServiceId = 'sms-service';
    }

    return {
      id: sidebarServiceId,
      serviceID: service.serviceID,
      name: service.name,
      description: service.description || `Start fresh and build a fully customized ${service.name.toLowerCase()} service tailored to your unique needs.`,
      icon: getServiceIcon(service.name, service.id),
      color: service.color || getServiceColor(service.name, service.id),
      isActive: service.isActive
    };
  });

  // The services to display (from API)
  const displayServices = serviceCards;
  // Function to handle service selection (temporary - not saved yet)
  const toggleService = (serviceId: string) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId];

    setSelectedServices(newServices);
  };

  // Initialize with any initial services
  useEffect(() => {
    if (initialSelectedServices.length > 0) {
      setSelectedServices(initialSelectedServices);

      if (onServicesChange) {
        onServicesChange(initialSelectedServices);
      }
    }
  }, [initialSelectedServices, onServicesChange]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Function to get background color class based on service color and selection state
  const getBackgroundColor = (serviceColor: string, isSelected: boolean) => {
    const colorMap: Record<string, { base: string, selected: string, hover: string, lightBg: string, darkBg: string }> = {
      'indigo': {
        base: 'bg-indigo-400',
        selected: 'bg-indigo-500',
        hover: 'group-hover:bg-indigo-500',
        lightBg: 'bg-indigo-100',
        darkBg: 'dark:bg-indigo-900/20'
      },
      'purple': {
        base: 'bg-purple-400',
        selected: 'bg-purple-500',
        hover: 'group-hover:bg-purple-500',
        lightBg: 'bg-purple-100',
        darkBg: 'dark:bg-purple-900/20'
      },
      'blue': {
        base: 'bg-blue-400',
        selected: 'bg-blue-500',
        hover: 'group-hover:bg-blue-500',
        lightBg: 'bg-blue-100',
        darkBg: 'dark:bg-blue-900/20'
      },
      'green': {
        base: 'bg-green-400',
        selected: 'bg-green-500',
        hover: 'group-hover:bg-green-500',
        lightBg: 'bg-green-100',
        darkBg: 'dark:bg-green-900/20'
      },
      'gray': {
        base: 'bg-gray-400',
        selected: 'bg-gray-500',
        hover: 'group-hover:bg-gray-500',
        lightBg: 'bg-gray-100',
        darkBg: 'dark:bg-gray-900/20'
      }
    };

    const colors = colorMap[serviceColor] || colorMap['gray'];
    return {
      iconBg: isSelected ? colors.selected : `${colors.base} ${colors.hover}`,
      wrapperBg: `${colors.lightBg} ${colors.darkBg}`
    };
  };

  const [isSaving, setIsSaving] = useState(false);
  const saveServices = async () => {
    if (!assistantId) {
      setNotificationData({
        variant: 'error',
        title: 'Error',
        description: 'Assistant ID is required to save services.'
      });
      setShowNotification(true);
      return;
    }

    if (selectedServices.length === 0) {
      setNotificationData({
        variant: 'info',
        title: 'No Services Selected',
        description: 'Please select at least one service to save.'
      });
      setShowNotification(true);
      return;
    }

    setIsSaving(true);

    try {
      const selectedServiceIDs = selectedServices.map(id => {
        // Find the original service that matches this UI ID
        const service = apiServices.find(s => {
          const serviceName = s.name.toLowerCase();
          if (id === 'chatbot-service' && serviceName.includes('chat')) {
            return true;
          } else if (id === 'voice-service' && serviceName.includes('voice')) {
            return true;
          } else if (id === 'agent-calling-service' && (serviceName.includes('call') || serviceName.includes('agent'))) {
            return true;
          } else if (id === 'sms-service' && (serviceName.includes('sms') || serviceName.includes('message'))) {
            return true;
          }
          return s.id === id; // Fallback to direct ID match
        });

        return service?.serviceID || '';
      }).filter(id => id !== '');

      // Use the services service upsert method
      await servicesService.upsertServices(assistantId, selectedServiceIDs);

      // Show success notification
      const serviceNames = selectedServices.map(id =>
        displayServices.find(card => card.id === id)?.name
      ).filter(Boolean).join(', '); setNotificationData({
        variant: 'success',
        title: 'Services Updated Successfully',
        description: `Selected services: ${serviceNames}`
      });
      setShowNotification(true);

      // NOW update the sidebar with the successfully saved services
      if (onServicesChange) {
        onServicesChange(selectedServices);
      }

    } catch (error) {
      console.error('Error saving services:', error);

      setNotificationData({
        variant: 'error',
        title: 'Failed to Save Services',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      });
      setShowNotification(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 dark:bg-white/[0.03] dark:border-gray-800 overflow-auto min-h-[42rem] relative">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-[9999] transition-all duration-300 ease-in-out transform"
          style={{ top: '80px' }}>
          <div className={`flex items-center justify-between gap-3 w-full sm:max-w-[340px] rounded-md border-b-4 p-3 shadow-lg bg-white dark:bg-[#1E2634] ${notificationData.variant === 'success' ? 'border-success-500' :
            notificationData.variant === 'info' ? 'border-blue-light-500' :
              notificationData.variant === 'warning' ? 'border-warning-500' :
                'border-error-500'
            }`}>
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${notificationData.variant === 'success' ? 'bg-success-50 text-success-500' :
                notificationData.variant === 'info' ? 'bg-blue-light-50 text-blue-light-500' :
                  notificationData.variant === 'warning' ? 'bg-warning-50 text-warning-500' :
                    'bg-error-50 text-error-500'
                }`}>
                {notificationData.variant === 'success' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM16.2071 9.20711C16.5976 8.81658 16.5976 8.18342 16.2071 7.79289C15.8166 7.40237 15.1834 7.40237 14.7929 7.79289L10.5 12.0858L9.20711 10.7929C8.81658 10.4024 8.18342 10.4024 7.79289 10.7929C7.40237 11.1834 7.40237 11.8166 7.79289 12.2071L9.79289 14.2071C10.1834 14.5976 10.8166 14.5976 11.2071 14.2071L16.2071 9.20711Z" fill="currentColor" />
                  </svg>
                )}
                {notificationData.variant === 'info' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM11 8C11 7.44772 11.4477 7 12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8ZM11 11C11 10.4477 11.4477 10 12 10C12.5523 10 13 10.4477 13 11V16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16V11Z" fill="currentColor" />
                  </svg>
                )}
                {notificationData.variant === 'warning' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C13.3267 2 14.5492 2.78167 15.134 4.01834L21.5547 15.0183C22.1395 16.255 22.1395 17.745 21.5547 18.9817C20.9699 20.2183 19.7474 21 18.4207 21H5.57929C4.25257 21 3.03011 20.2183 2.44531 18.9817C1.86051 17.745 1.86051 16.255 2.44531 15.0183L8.86603 4.01834C9.45083 2.78167 10.6733 2 12 2ZM12 7C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12V8C11 7.44772 11.4477 7 12 7ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z" fill="currentColor" />
                  </svg>
                )}
                {notificationData.variant === 'error' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM8.79289 8.79289C9.18342 8.40237 9.81658 8.40237 10.2071 8.79289L12 10.5858L13.7929 8.79289C14.1834 8.40237 14.8166 8.40237 15.2071 8.79289C15.5976 9.18342 15.5976 9.81658 15.2071 10.2071L13.4142 12L15.2071 13.7929C15.5976 14.1834 15.5976 14.8166 15.2071 15.2071C14.8166 15.5976 14.1834 15.5976 13.7929 15.2071L12 13.4142L10.2071 15.2071C9.81658 15.5976 9.18342 15.5976 8.79289 15.2071C8.40237 14.8166 8.40237 14.1834 8.79289 13.7929L10.5858 12L8.79289 10.2071C8.40237 9.81658 8.40237 9.18342 8.79289 8.79289Z" fill="currentColor" />
                  </svg>
                )}
              </div>

              {/* Title and Description */}
              <div>
                <h4 className="text-sm text-gray-800 sm:text-base dark:text-white/90">
                  {notificationData.title}
                </h4>
                {notificationData.description && (
                  <p className="mt-1 text-xs text-gray-600 sm:text-sm dark:text-white/70">
                    {notificationData.description}
                  </p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowNotification(false)}
              className="text-gray-400 hover:text-gray-800 dark:hover:text-white/90 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Manage Services</h2>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-700 dark:text-red-300">Failed to load services. Please try again.</span>
            <button
              onClick={refetch}
              className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 underline text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Cards */}
          {displayServices.map(service => {
            const { iconBg, wrapperBg } = getBackgroundColor(service.color, selectedServices.includes(service.id));
            return (
              <div
                key={service.id}
                className={`border ${selectedServices.includes(service.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg overflow-hidden relative cursor-pointer transition-all hover:shadow-md group`}
                onClick={() => toggleService(service.id)}
              >
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <div className={`h-5 w-5 rounded ${selectedServices.includes(service.id) ? 'bg-indigo-500' : 'border border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                    {selectedServices.includes(service.id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="p-5 flex items-center">
                  <div className={`h-16 w-16 ${wrapperBg} rounded-lg flex items-center justify-center mr-4`}>
                    <div className={`h-16 w-16 ${iconBg} rounded-lg flex items-center justify-center transition-colors`}>
                      {service.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{service.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {!loading && (
        <div className="flex justify-start mt-8">
          <button
            onClick={saveServices}
            disabled={isSaving}
            className={`px-5 py-2.5 font-medium rounded-lg transition-colors focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800 ${isSaving
              ? 'bg-indigo-400 text-white cursor-not-allowed'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Selected Services'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Services;