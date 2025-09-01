import { TokenManager } from '@/utils/tokenManager';
import { isApiError } from '@/utils/errorUtils';
import type { 
  Language, 
  RawLanguageData 
} from '@/types/language';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const extractLanguagesFromResponse = (data: unknown): Language[] => {
  if (Array.isArray(data)) {
    return data.map((lang: RawLanguageData) => normalizeLanguage(lang));
  }

  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>;

    if (dataObj.data && Array.isArray(dataObj.data)) {
      return dataObj.data.map((lang: RawLanguageData) => normalizeLanguage(lang));
    }

    if (dataObj.languages && Array.isArray(dataObj.languages)) {
      return dataObj.languages.map((lang: RawLanguageData) => normalizeLanguage(lang));
    }

    if (dataObj.data && typeof dataObj.data === 'object' && !Array.isArray(dataObj.data)) {
      const nestedData = dataObj.data as Record<string, unknown>;
      if (nestedData.languages && Array.isArray(nestedData.languages)) {
        return nestedData.languages.map((lang: RawLanguageData) => normalizeLanguage(lang));
      }
    }

    if (dataObj.id && dataObj.name) {
      return [normalizeLanguage(data as RawLanguageData)];
    }
  }

  console.error('Unexpected API response structure:', data);
  return [];
};

/**
 * Normalizes language object to match the expected Language interface
 */
const normalizeLanguage = (lang: RawLanguageData): Language => {
  // Construct a valid Language object from API response
  return {
    id: lang.id || lang.languageId || lang.language_id || String(Math.random()),
    languageID: lang.languageID || lang.languageId || lang.language_id || lang.id || String(Math.random()),
    name: lang.languageName || lang.name || lang.language_name || 'Unknown Language',
    languageName: lang.languageName || lang.name || lang.language_name,
    code: lang.languageCode || lang.code || lang.language_code || 'xx',
    languageCode: lang.languageCode || lang.code || lang.language_code
  };
};

/**
 * Fetches available languages from the backend API
 * @returns A promise that resolves to an array of Language objects
 */
export const getLanguages = async (): Promise<Language[]> => {
  try {
    const token = TokenManager.getAccessToken();

    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/languages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch languages: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // parse the response as JSON
    let data: unknown;
    const responseText = await response.text();
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error('Failed to parse JSON response:', err);
      throw new Error('Invalid JSON response from languages API');
    }


    // Extract languages from the response
    const languages = extractLanguagesFromResponse(data);

    return languages;
  } catch (error) {
    console.error('Error fetching languages:', error);
    if (isApiError(error)) {
      throw error;
    }
    throw new Error(`Failed to fetch languages: ${error instanceof Error ? error.message : String(error)}`);
  }
};
