
export const authService = {
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  },

  logout: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    window.location.href = '/signin';
  },

  submitOnboardingData: async (data: any) => {
    console.log('Submitting onboarding data:', data);
    // Mock API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, you would make a POST request here
    // return fetch('/api/onboarding', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    
    return Promise.resolve({ success: true });
  }
};
